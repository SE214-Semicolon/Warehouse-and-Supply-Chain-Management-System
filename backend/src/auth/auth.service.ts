import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import bcryptjs from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(email: string, password: string, fullName?: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new UnauthorizedException('Email already registered');
    const passwordHash = await bcryptjs.hash(password, 10);
    const user = await this.usersService.createUser({ email, passwordHash, fullName });
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

  private parseTtl(ttl: string): number {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (multipliers[unit] || 86400000);
  }
}
