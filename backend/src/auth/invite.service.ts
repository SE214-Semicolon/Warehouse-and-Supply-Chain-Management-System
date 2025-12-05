import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { QueryInviteDto } from './dto/query-invite.dto';
import { UserInvite, UserRole, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo invite token mới
   */
  async createInvite(
    dto: CreateInviteDto,
    createdById: string,
  ): Promise<
    UserInvite & { createdBy: { id: string; email: string | null; fullName: string | null } | null }
  > {
    // Check if email already has a pending (unused, not expired) invite
    const existingPending = await this.prisma.userInvite.findFirst({
      where: {
        email: dto.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        `Email ${dto.email} already has a pending invite (token: ${existingPending.token})`,
      );
    }

    // Check if email already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException(`Email ${dto.email} is already registered`);
    }

    // Generate unique token
    const token = this.generateToken();

    // Calculate expiry date
    const expiryDays = dto.expiryDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const invite = await this.prisma.userInvite.create({
      data: {
        email: dto.email,
        role: dto.role,
        token,
        createdById,
        expiresAt,
      },
    });

    // Fetch createdBy separately
    const createdBy = createdById
      ? await this.prisma.user.findUnique({
          where: { id: createdById },
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        })
      : null;

    return {
      ...invite,
      createdBy: createdBy || {
        id: createdById || '',
        email: null,
        fullName: null,
      },
    } as UserInvite & {
      createdBy: { id: string; email: string | null; fullName: string | null } | null;
    };
  }

  /**
   * List invites với filters
   */
  async listInvites(query: QueryInviteDto): Promise<{
    data: UserInvite[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = this.buildWhereClause(query);

    const [data, total] = await Promise.all([
      this.prisma.userInvite.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          usedBy: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.userInvite.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Get invite by ID
   */
  async getInviteById(id: string): Promise<UserInvite> {
    const invite = await this.prisma.userInvite.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        usedBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return invite;
  }

  /**
   * Get invite by token
   */
  async getInviteByToken(token: string): Promise<UserInvite | null> {
    return this.prisma.userInvite.findUnique({
      where: { token },
    });
  }

  /**
   * Validate invite token và return role
   */
  async validateAndConsumeInvite(token: string, userId: string): Promise<UserRole> {
    const invite = await this.getInviteByToken(token);

    if (!invite) {
      throw new BadRequestException('Invalid invite token');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Invite token already used');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite token expired');
    }

    // Mark as used
    await this.prisma.userInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedById: userId,
      },
    });

    return invite.role;
  }

  /**
   * Revoke/delete invite
   */
  async revokeInvite(id: string): Promise<void> {
    const invite = await this.prisma.userInvite.findUnique({
      where: { id },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Cannot revoke used invite');
    }

    await this.prisma.userInvite.delete({
      where: { id },
    });
  }

  /**
   * Resend invite (tạo token mới cho email cũ)
   */
  async resendInvite(id: string, createdById: string): Promise<UserInvite> {
    const oldInvite = await this.getInviteById(id);

    if (oldInvite.usedAt) {
      throw new BadRequestException('Cannot resend used invite');
    }

    // Delete old invite
    await this.prisma.userInvite.delete({
      where: { id },
    });

    // Create new invite with same params
    return this.createInvite(
      {
        email: oldInvite.email,
        role: oldInvite.role,
        expiryDays: 7,
      },
      createdById,
    );
  }

  /**
   * Clean up expired invites (cron job có thể gọi)
   */
  async cleanupExpiredInvites(): Promise<number> {
    const result = await this.prisma.userInvite.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        usedAt: null,
      },
    });

    return result.count;
  }

  /**
   * Helper: Generate unique token
   */
  private generateToken(): string {
    // Format: inv-{random}
    const random = randomBytes(16).toString('hex');
    return `inv-${random}`;
  }

  /**
   * Helper: Build where clause for queries
   */
  private buildWhereClause(query: QueryInviteDto): Prisma.UserInviteWhereInput {
    const where: Prisma.UserInviteWhereInput = {};

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.used !== undefined) {
      where.usedAt = query.used ? { not: null } : null;
    }

    if (query.expired !== undefined) {
      const now = new Date();
      where.expiresAt = query.expired ? { lt: now } : { gte: now };
    }

    return where;
  }
}
