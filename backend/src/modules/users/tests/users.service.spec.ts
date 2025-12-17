import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import bcryptjs from 'bcryptjs';

jest.mock('bcryptjs');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser: any = {
    id: 'user-uuid-1',
    username: 'test@example.com',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    fullName: 'Test User',
    role: UserRole.warehouse_staff,
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUserResponse: any = {
    id: 'user-uuid-1',
    username: 'test@example.com',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.warehouse_staff,
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);

    // Mock bcryptjs
    (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user by ID', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById('user-uuid-1');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a user with minimum required fields', async () => {
      const createData = {
        email: 'new@example.com',
        passwordHash: 'hashed-password',
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.createUser(createData);

      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'new@example.com',
          email: 'new@example.com',
          passwordHash: 'hashed-password',
          fullName: null,
          role: 'warehouse_staff',
        },
      });
    });

    it('should create a user with all fields', async () => {
      const createData = {
        email: 'new@example.com',
        passwordHash: 'hashed-password',
        fullName: 'New User',
        role: UserRole.admin,
      };

      (prisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        fullName: 'New User',
        role: UserRole.admin,
      });

      const result = await service.createUser(createData);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'new@example.com',
          email: 'new@example.com',
          passwordHash: 'hashed-password',
          fullName: 'New User',
          role: UserRole.admin,
        },
      });
    });
  });

  describe('list', () => {
    it('should return users with default pagination', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 1]);

      const result = await service.list({});

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter users by email', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 1]);

      const result = await service.list({ email: 'test@' });

      expect(result.data).toEqual(mockUsers);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter users by role', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 1]);

      await service.list({ role: UserRole.admin });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should filter users by active status', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 1]);

      await service.list({ active: true });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should support search with q parameter', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 1]);

      await service.list({ q: 'test' });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should support pagination with page and pageSize', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 50]);

      const result = await service.list({ page: 2, pageSize: 10 });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should support sorting', async () => {
      const mockUsers = [mockUserResponse];
      (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, 1]);

      await service.list({ sort: 'email:asc' });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findByIdSafe', () => {
    it('should return a user by ID without passwordHash', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserResponse);

      const result = await service.findByIdSafe('user-uuid-1');

      expect(result).toEqual(mockUserResponse);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        select: expect.objectContaining({
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          active: true,
          createdAt: true,
        }),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findByIdSafe('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findByIdSafe('invalid-id')).rejects.toThrow('User not found');
    });
  });

  describe('createUserByAdmin', () => {
    it('should create a new user with hashed password', async () => {
      const createDto = {
        email: 'newuser@example.com',
        password: 'plain-password',
        fullName: 'New User',
        role: UserRole.warehouse_staff,
        active: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUserResponse);

      const result = await service.createUserByAdmin(createDto);

      expect(result).toEqual(mockUserResponse);
      expect(bcryptjs.hash).toHaveBeenCalledWith('plain-password', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'newuser@example.com',
          email: 'newuser@example.com',
          passwordHash: 'hashed-password',
          fullName: 'New User',
          role: UserRole.warehouse_staff,
          active: true,
        },
        select: expect.any(Object),
      });
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createDto = {
        email: 'existing@example.com',
        password: 'password',
        role: UserRole.warehouse_staff,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.createUserByAdmin(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createUserByAdmin(createDto)).rejects.toThrow('Email already exists');
    });

    it('should create user with default active=true if not specified', async () => {
      const createDto = {
        email: 'newuser@example.com',
        password: 'password',
        role: UserRole.warehouse_staff,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUserResponse);

      await service.createUserByAdmin(createDto);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update user fullName successfully', async () => {
      const updateDto = { fullName: 'Updated Name' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserResponse,
        fullName: 'Updated Name',
      });

      const result = await service.update('user-uuid-1', updateDto, 'other-user-id');

      expect(result.fullName).toBe('Updated Name');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { fullName: 'Updated Name' },
        select: expect.any(Object),
      });
    });

    it('should update user role successfully', async () => {
      const updateDto = { role: UserRole.admin };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserResponse,
        role: UserRole.admin,
      });

      const result = await service.update('user-uuid-1', updateDto, 'other-user-id');

      expect(result.role).toBe(UserRole.admin);
    });

    it('should update user active status successfully', async () => {
      const updateDto = { active: false };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserResponse,
        active: false,
      });

      const result = await service.update('user-uuid-1', updateDto, 'other-user-id');

      expect(result.active).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('invalid-id', { fullName: 'Test' }, 'other-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user tries to change their own role', async () => {
      const updateDto = { role: UserRole.admin };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.update('user-uuid-1', updateDto, 'user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('user-uuid-1', updateDto, 'user-uuid-1')).rejects.toThrow(
        'Cannot change your own role',
      );
    });

    it('should update multiple fields at once', async () => {
      const updateDto = {
        fullName: 'Updated Name',
        role: UserRole.sales,
        active: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserResponse,
        ...updateDto,
      });

      const result = await service.update('user-uuid-1', updateDto, 'other-user-id');

      expect(result.fullName).toBe('Updated Name');
      expect(result.role).toBe(UserRole.sales);
      expect(result.active).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserResponse,
        active: false,
      });

      const result = await service.deactivate('user-uuid-1', 'other-user-id');

      expect(result.active).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { active: false },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deactivate('invalid-id', 'other-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user tries to deactivate themselves', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.deactivate('user-uuid-1', 'user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deactivate('user-uuid-1', 'user-uuid-1')).rejects.toThrow(
        'Cannot deactivate yourself',
      );
    });
  });
});
