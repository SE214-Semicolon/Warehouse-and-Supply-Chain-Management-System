// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InviteService } from '../../services/invite.service';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateInviteDto } from '../dto/create-invite.dto';
import { QueryInviteDto } from '../dto/query-invite.dto';
import { UserRole } from '@prisma/client';

describe('InviteService', () => {
  let service: InviteService;
  let prisma: jest.Mocked<PrismaService>;

  const mockInvite: any = {
    id: 'invite-uuid-1',
    email: 'invited@example.com',
    role: UserRole.manager,
    token: 'inv-abc123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usedAt: null,
    usedById: null,
    createdById: 'admin-uuid',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUser: any = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.admin,
  };

  const mockCreatedBy: any = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    fullName: 'Admin User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        {
          provide: PrismaService,
          useValue: {
            userInvite: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          } as any,
        },
      ],
    }).compile();

    service = module.get<InviteService>(InviteService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvite', () => {
    const createDto: CreateInviteDto = {
      email: 'newuser@example.com',
      role: UserRole.manager,
      expiryDays: 7,
    };
    const createdById = 'admin-uuid';

    it('should create a new invite successfully', async () => {
      prisma.userInvite.findFirst.mockResolvedValue(null);
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(mockCreatedBy); // CreatedBy lookup
      prisma.userInvite.create.mockResolvedValue(mockInvite);

      const result = await service.createInvite(createDto, createdById);

      expect(prisma.userInvite.findFirst).toHaveBeenCalledWith({
        where: {
          email: createDto.email,
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(prisma.userInvite.create).toHaveBeenCalledWith({
        data: {
          email: createDto.email,
          role: createDto.role,
          token: expect.stringMatching(/^inv-[a-f0-9]{32}$/),
          createdById,
          expiresAt: expect.any(Date),
        },
      });
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('createdBy');
      expect(result.email).toBe(mockInvite.email);
    });

    it('should throw BadRequestException if email has pending invite', async () => {
      const pendingInvite = { ...mockInvite, token: 'existing-token' };
      prisma.userInvite.findFirst.mockResolvedValue(pendingInvite);

      await expect(service.createInvite(createDto, createdById)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createInvite(createDto, createdById)).rejects.toThrow(
        `Email ${createDto.email} already has a pending invite (token: existing-token)`,
      );
      expect(prisma.userInvite.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email is already registered', async () => {
      prisma.userInvite.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.createInvite(createDto, createdById)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createInvite(createDto, createdById)).rejects.toThrow(
        `Email ${createDto.email} is already registered`,
      );
      expect(prisma.userInvite.create).not.toHaveBeenCalled();
    });

    it('should generate unique token in correct format', async () => {
      prisma.userInvite.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.userInvite.create.mockImplementation((args: any) =>
        Promise.resolve({ ...mockInvite, token: args.data.token }),
      );

      const result = await service.createInvite(createDto, createdById);

      expect(result.token).toMatch(/^inv-[a-f0-9]{32}$/);
    });

    it('should use default expiry days if not provided', async () => {
      const dtoWithoutExpiry = { email: 'test@example.com', role: UserRole.manager };
      prisma.userInvite.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockCreatedBy);
      prisma.userInvite.create.mockResolvedValue(mockInvite);

      await service.createInvite(dtoWithoutExpiry, createdById);

      const createCall = prisma.userInvite.create.mock.calls[0][0];
      const expiryDate = createCall.data.expiresAt;
      const daysDiff = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(7);
    });

    it('should calculate correct expiry date with custom expiryDays', async () => {
      const customDto = { ...createDto, expiryDays: 14 };
      prisma.userInvite.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockCreatedBy);
      prisma.userInvite.create.mockResolvedValue(mockInvite);

      await service.createInvite(customDto, createdById);

      const createCall = prisma.userInvite.create.mock.calls[0][0];
      const expiryDate = createCall.data.expiresAt;
      const daysDiff = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBeGreaterThanOrEqual(13);
      expect(daysDiff).toBeLessThanOrEqual(14);
    });

    it('should handle createdBy lookup returning null gracefully', async () => {
      prisma.userInvite.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // CreatedBy not found
      prisma.userInvite.create.mockResolvedValue(mockInvite);

      const result = await service.createInvite(createDto, createdById);

      expect(result.createdBy).toEqual({
        id: createdById,
        email: null,
        fullName: null,
      });
    });
  });

  describe('listInvites', () => {
    const mockInvites = [
      { ...mockInvite, id: 'invite-1' },
      { ...mockInvite, id: 'invite-2', email: 'user2@example.com' },
    ];

    it('should list invites with default pagination', async () => {
      const query: QueryInviteDto = {};
      prisma.userInvite.findMany.mockResolvedValue(mockInvites);
      prisma.userInvite.count.mockResolvedValue(2);

      const result = await service.listInvites(query);

      expect(result).toEqual({
        data: mockInvites,
        total: 2,
        page: 1,
        pageSize: 20,
      });
      expect(prisma.userInvite.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, email: true, fullName: true } },
          usedBy: { select: { id: true, email: true, fullName: true } },
        },
      });
    });

    it('should list invites with custom pagination', async () => {
      const query: QueryInviteDto = { page: 2, pageSize: 10 };
      prisma.userInvite.findMany.mockResolvedValue(mockInvites);
      prisma.userInvite.count.mockResolvedValue(25);

      const result = await service.listInvites(query);

      expect(result).toEqual({
        data: mockInvites,
        total: 25,
        page: 2,
        pageSize: 10,
      });
      expect(prisma.userInvite.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by email', async () => {
      const query: QueryInviteDto = { email: 'test@example.com' };
      prisma.userInvite.findMany.mockResolvedValue([mockInvites[0]]);
      prisma.userInvite.count.mockResolvedValue(1);

      await service.listInvites(query);

      expect(prisma.userInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: { contains: 'test@example.com', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should filter by role', async () => {
      const query: QueryInviteDto = { role: UserRole.manager };
      prisma.userInvite.findMany.mockResolvedValue(mockInvites);
      prisma.userInvite.count.mockResolvedValue(2);

      await service.listInvites(query);

      expect(prisma.userInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: UserRole.manager },
        }),
      );
    });

    it('should filter by used status (true)', async () => {
      const query: QueryInviteDto = { used: true };
      prisma.userInvite.findMany.mockResolvedValue([]);
      prisma.userInvite.count.mockResolvedValue(0);

      await service.listInvites(query);

      expect(prisma.userInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usedAt: { not: null } },
        }),
      );
    });

    it('should filter by used status (false)', async () => {
      const query: QueryInviteDto = { used: false };
      prisma.userInvite.findMany.mockResolvedValue(mockInvites);
      prisma.userInvite.count.mockResolvedValue(2);

      await service.listInvites(query);

      expect(prisma.userInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usedAt: null },
        }),
      );
    });

    it('should filter by expired status (true)', async () => {
      const query: QueryInviteDto = { expired: true };
      prisma.userInvite.findMany.mockResolvedValue([]);
      prisma.userInvite.count.mockResolvedValue(0);

      await service.listInvites(query);

      const whereClause = prisma.userInvite.findMany.mock.calls[0][0].where;
      expect(whereClause).toHaveProperty('expiresAt');
      expect(whereClause.expiresAt).toHaveProperty('lt');
    });

    it('should filter by expired status (false)', async () => {
      const query: QueryInviteDto = { expired: false };
      prisma.userInvite.findMany.mockResolvedValue(mockInvites);
      prisma.userInvite.count.mockResolvedValue(2);

      await service.listInvites(query);

      const whereClause = prisma.userInvite.findMany.mock.calls[0][0].where;
      expect(whereClause).toHaveProperty('expiresAt');
      expect(whereClause.expiresAt).toHaveProperty('gte');
    });

    it('should apply multiple filters simultaneously', async () => {
      const query: QueryInviteDto = {
        email: 'test',
        role: UserRole.admin,
        used: false,
        expired: false,
      };
      prisma.userInvite.findMany.mockResolvedValue([]);
      prisma.userInvite.count.mockResolvedValue(0);

      await service.listInvites(query);

      const whereClause = prisma.userInvite.findMany.mock.calls[0][0].where;
      expect(whereClause).toMatchObject({
        email: { contains: 'test', mode: 'insensitive' },
        role: UserRole.admin,
        usedAt: null,
      });
      expect(whereClause).toHaveProperty('expiresAt');
    });
  });

  describe('getInviteById', () => {
    it('should return invite by id', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(mockInvite);

      const result = await service.getInviteById('invite-uuid-1');

      expect(result).toEqual(mockInvite);
      expect(prisma.userInvite.findUnique).toHaveBeenCalledWith({
        where: { id: 'invite-uuid-1' },
        include: {
          createdBy: { select: { id: true, email: true, fullName: true } },
          usedBy: { select: { id: true, email: true, fullName: true } },
        },
      });
    });

    it('should throw NotFoundException if invite not found', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(null);

      await expect(service.getInviteById('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.getInviteById('non-existent-id')).rejects.toThrow('Invite not found');
    });
  });

  describe('getInviteByToken', () => {
    it('should return invite by token', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(mockInvite);

      const result = await service.getInviteByToken('inv-abc123');

      expect(result).toEqual(mockInvite);
      expect(prisma.userInvite.findUnique).toHaveBeenCalledWith({
        where: { token: 'inv-abc123' },
      });
    });

    it('should return null if token not found', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(null);

      const result = await service.getInviteByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('validateAndConsumeInvite', () => {
    const validToken = 'inv-valid-token';
    const userId = 'user-uuid-1';

    it('should validate and consume a valid invite', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(mockInvite);
      prisma.userInvite.update.mockResolvedValue({
        ...mockInvite,
        usedAt: new Date(),
        usedById: userId,
      });

      const result = await service.validateAndConsumeInvite(validToken, userId);

      expect(result).toBe(UserRole.manager);
      expect(prisma.userInvite.update).toHaveBeenCalledWith({
        where: { id: mockInvite.id },
        data: {
          usedAt: expect.any(Date),
          usedById: userId,
        },
      });
    });

    it('should throw BadRequestException if token is invalid', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(null);

      await expect(service.validateAndConsumeInvite('invalid-token', userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateAndConsumeInvite('invalid-token', userId)).rejects.toThrow(
        'Invalid invite token',
      );
      expect(prisma.userInvite.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token already used', async () => {
      const usedInvite = { ...mockInvite, usedAt: new Date() };
      prisma.userInvite.findUnique.mockResolvedValue(usedInvite);

      await expect(service.validateAndConsumeInvite(validToken, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateAndConsumeInvite(validToken, userId)).rejects.toThrow(
        'Invite token already used',
      );
      expect(prisma.userInvite.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token expired', async () => {
      const expiredInvite = {
        ...mockInvite,
        expiresAt: new Date(Date.now() - 1000),
      };
      prisma.userInvite.findUnique.mockResolvedValue(expiredInvite);

      await expect(service.validateAndConsumeInvite(validToken, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateAndConsumeInvite(validToken, userId)).rejects.toThrow(
        'Invite token expired',
      );
      expect(prisma.userInvite.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeInvite', () => {
    it('should revoke an unused invite', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(mockInvite);
      prisma.userInvite.delete.mockResolvedValue(mockInvite);

      await service.revokeInvite('invite-uuid-1');

      expect(prisma.userInvite.delete).toHaveBeenCalledWith({
        where: { id: 'invite-uuid-1' },
      });
    });

    it('should throw NotFoundException if invite not found', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(null);

      await expect(service.revokeInvite('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.revokeInvite('non-existent-id')).rejects.toThrow('Invite not found');
      expect(prisma.userInvite.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to revoke used invite', async () => {
      const usedInvite = { ...mockInvite, usedAt: new Date() };
      prisma.userInvite.findUnique.mockResolvedValue(usedInvite);

      await expect(service.revokeInvite('invite-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.revokeInvite('invite-uuid-1')).rejects.toThrow(
        'Cannot revoke used invite',
      );
      expect(prisma.userInvite.delete).not.toHaveBeenCalled();
    });
  });

  describe('resendInvite', () => {
    const createdById = 'admin-uuid-2';

    it('should resend invite by creating new one', async () => {
      const oldInvite = {
        ...mockInvite,
        id: 'old-invite-id',
        token: 'old-token',
      };
      const newInvite = {
        ...mockInvite,
        id: 'new-invite-id',
        token: 'new-token',
        createdBy: mockCreatedBy,
      };

      prisma.userInvite.findUnique.mockResolvedValue(oldInvite);
      prisma.userInvite.delete.mockResolvedValue(oldInvite);
      prisma.userInvite.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockCreatedBy);
      prisma.userInvite.create.mockResolvedValue(newInvite);

      const result = await service.resendInvite('old-invite-id', createdById);

      expect(prisma.userInvite.delete).toHaveBeenCalledWith({
        where: { id: 'old-invite-id' },
      });
      expect(prisma.userInvite.create).toHaveBeenCalledWith({
        data: {
          email: oldInvite.email,
          role: oldInvite.role,
          token: expect.any(String),
          createdById,
          expiresAt: expect.any(Date),
        },
      });
      expect(result.email).toBe(oldInvite.email);
      expect(result.role).toBe(oldInvite.role);
    });

    it('should throw NotFoundException if invite not found', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(null);

      await expect(service.resendInvite('non-existent-id', createdById)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if trying to resend used invite', async () => {
      const usedInvite = { ...mockInvite, usedAt: new Date() };
      prisma.userInvite.findUnique.mockResolvedValue(usedInvite);

      await expect(service.resendInvite('invite-uuid-1', createdById)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resendInvite('invite-uuid-1', createdById)).rejects.toThrow(
        'Cannot resend used invite',
      );
      expect(prisma.userInvite.delete).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredInvites', () => {
    it('should delete expired and unused invites', async () => {
      prisma.userInvite.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredInvites();

      expect(result).toBe(5);
      expect(prisma.userInvite.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          usedAt: null,
        },
      });
    });

    it('should return 0 if no expired invites found', async () => {
      prisma.userInvite.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupExpiredInvites();

      expect(result).toBe(0);
    });

    it('should not delete used invites even if expired', async () => {
      prisma.userInvite.deleteMany.mockResolvedValue({ count: 3 });

      await service.cleanupExpiredInvites();

      const whereClause = prisma.userInvite.deleteMany.mock.calls[0][0].where;
      expect(whereClause.usedAt).toBe(null);
    });
  });
});
