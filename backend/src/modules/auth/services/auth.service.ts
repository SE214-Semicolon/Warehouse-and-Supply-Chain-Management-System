import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import bcryptjs from 'bcryptjs';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { InviteService } from './invite.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly inviteService: InviteService,
  ) {}

  async signup(email: string, password: string, fullName?: string, inviteToken?: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new UnauthorizedException('Email already registered');

    const passwordHash = await bcryptjs.hash(password, 10);

    // Pre-validate invite token before transaction (fail fast)
    let role: UserRole | undefined;
    if (inviteToken) {
      const invite = await this.inviteService.getInviteByToken(inviteToken);
      if (!invite) {
        throw new UnauthorizedException('Invalid invite token');
      }
      if (invite.usedAt) {
        throw new UnauthorizedException('Invite token already used');
      }
      if (new Date() > invite.expiresAt) {
        throw new UnauthorizedException('Invite token expired');
      }
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        throw new UnauthorizedException('Invite token is for a different email');
      }
      role = invite.role;
    }

    // ATOMIC: Create user + Consume invite in single transaction
    // This prevents race condition where multiple users could signup with same invite
    const user = await this.prisma.$transaction(async (tx) => {
      // Step 1: Create user
      const newUser = await tx.user.create({
        data: {
          username: email, // simple default mapping
          email,
          passwordHash,
          fullName: fullName ?? null,
          role: role ?? ('warehouse_staff' as unknown as UserRole),
        },
      });

      // Step 2: Consume invite if provided
      if (inviteToken) {
        // Double-check invite hasn't been used (race condition protection)
        const invite = await tx.userInvite.findUnique({
          where: { token: inviteToken },
        });

        if (!invite || invite.usedAt) {
          throw new UnauthorizedException(
            'Invite token no longer valid. It may have been used by another signup.',
          );
        }

        // Mark as consumed
        await tx.userInvite.update({
          where: { token: inviteToken },
          data: {
            usedAt: new Date(),
            usedById: newUser.id,
          },
        });
      }

      return newUser;
    });

    return this.issueTokens(user.id, user.email!, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcryptjs.compare(password, user.passwordHash ?? '');
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('Account is disabled');
    return this.issueTokens(user.id, user.email!, user.role);
  }

  async refresh(userId: string, tokenId: string) {
    const token = await this.prisma.refreshToken.findUnique({ where: { id: tokenId } });
    if (!token || token.userId !== userId || token.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token has expired
    if (new Date() > token.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.usersService.findById(userId);
    if (!user?.active) throw new UnauthorizedException('Account is disabled');
    return this.issueTokens(user.id, user.email!, user.role);
  }

  async refreshWithToken(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{ sub: string; jti: string }>(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET as string,
    });
    return this.refresh(payload.sub, payload.jti);
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET as string,
      expiresIn: process.env.JWT_ACCESS_TTL || '900s',
    });
    const refresh = await this.prisma.refreshToken.create({
      data: {
        userId,
        userEmail: email,
        userRole: role,
        expiresAt: new Date(Date.now() + this.parseTtl(process.env.JWT_REFRESH_TTL || '7d')),
      },
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: refresh.id },
      {
        secret: process.env.JWT_REFRESH_SECRET as string,
        expiresIn: process.env.JWT_REFRESH_TTL || '7d',
      },
    );
    return { accessToken, refreshToken };
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; jti: string }>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET as string,
        },
      );

      const token = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
      if (!token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.prisma.refreshToken.update({
        where: { id: payload.jti },
        data: { revokedAt: new Date() },
      });

      return { message: 'Logged out successfully' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const isPasswordValid = await bcryptjs.compare(currentPassword, user.passwordHash ?? '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcryptjs.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all existing refresh tokens to force re-login
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  private parseTtl(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (multipliers[unit] || 86400000);
  }
}
