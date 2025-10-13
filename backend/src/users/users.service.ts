import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

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
}
