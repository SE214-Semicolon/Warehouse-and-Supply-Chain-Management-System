import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    fullName?: string;
    role?: UserRole;
  }) {
    return this.prisma.user.create({
      data: {
        username: data.email, // simple default mapping
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName ?? null,
        role: data.role ?? ('warehouse_staff' as unknown as UserRole),
      },
    });
  }

  // New methods for User Management

  async list(query: QueryUserDto): Promise<{ data: UserResponseDto[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }
    if (query.fullName) {
      where.fullName = { contains: query.fullName, mode: 'insensitive' };
    }
    if (query.role) {
      where.role = query.role;
    }
    if (query.active !== undefined) {
      where.active = query.active;
    }
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { fullName: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput[] = [];
    for (const part of (query.sort ?? 'createdAt:desc').split(',')) {
      const [field, dir] = part.split(':');
      if (!field) continue;
      orderBy.push({
        [field]: dir === 'asc' ? 'asc' : 'desc',
      } as Prisma.UserOrderByWithRelationInput);
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        where,
        orderBy,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          active: true,
          createdAt: true,
          // Explicitly exclude passwordHash
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users as UserResponseDto[], total, page, pageSize };
  }

  async findByIdSafe(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
        // Explicitly exclude passwordHash
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user as UserResponseDto;
  }

  async createUserByAdmin(dto: CreateUserDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username: dto.email, // default mapping
        email: dto.email,
        passwordHash,
        fullName: dto.fullName ?? null,
        role: dto.role,
        active: dto.active ?? true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return user as UserResponseDto;
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<UserResponseDto> {
    // Check if user exists
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent user from changing their own role
    if (dto.role && currentUserId === id) {
      throw new BadRequestException('Cannot change your own role');
    }

    // Update user
    const updateData: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.active !== undefined) updateData.active = dto.active;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return updated as UserResponseDto;
  }

  async deactivate(id: string, currentUserId: string): Promise<UserResponseDto> {
    // Check if user exists
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-deactivation
    if (currentUserId === id) {
      throw new BadRequestException('Cannot deactivate yourself');
    }

    // Deactivate user
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return updated as UserResponseDto;
  }
}
