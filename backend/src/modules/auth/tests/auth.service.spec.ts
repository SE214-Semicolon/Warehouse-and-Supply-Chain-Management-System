// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { InviteService } from '../services/invite.service';
import { UserRole } from '@prisma/client';
import bcryptjs from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let prisma: jest.Mocked<PrismaService>;
  let inviteService: jest.Mocked<InviteService>;

  const mockUser: any = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    fullName: 'Test User',
    role: UserRole.warehouse_staff,
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockRefreshToken: any = {
    id: 'refresh-token-uuid-1',
    userId: 'user-uuid-1',
    userEmail: 'test@example.com',
    userRole: UserRole.warehouse_staff,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockInvite: any = {
    id: 'invite-uuid-1',
    email: 'invited@example.com',
    role: UserRole.admin,
    token: 'valid-invite-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usedAt: null,
    usedById: null,
    createdById: 'admin-uuid',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    // Set up environment variables for tests
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_TTL = '900s';
    process.env.JWT_REFRESH_TTL = '7d';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            user: {
              update: jest.fn(),
            },
          } as any,
        },
        {
          provide: InviteService,
          useValue: {
            getInviteByToken: jest.fn(),
            validateAndConsumeInvite: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prisma = module.get(PrismaService);
    inviteService = module.get(InviteService);

    // Default mock implementations
    (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user without invite token', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      };

      usersService.findByEmail.mockResolvedValue(null);
      usersService.createUser.mockResolvedValue({
        ...mockUser,
        email: signupData.email,
        fullName: signupData.fullName,
      });
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.signup(
        signupData.email,
        signupData.password,
        signupData.fullName,
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(signupData.email);
      expect(bcryptjs.hash).toHaveBeenCalledWith(signupData.password, 10);
      expect(usersService.createUser).toHaveBeenCalledWith({
        email: signupData.email,
        passwordHash: 'hashed-password',
        fullName: signupData.fullName,
        role: undefined,
      });
    });

    it('should create a new user with valid invite token', async () => {
      const signupData = {
        email: 'invited@example.com',
        password: 'password123',
        inviteToken: 'valid-invite-token',
      };

      usersService.findByEmail.mockResolvedValue(null);
      inviteService.getInviteByToken.mockResolvedValue(mockInvite);
      usersService.createUser.mockResolvedValue({
        ...mockUser,
        email: signupData.email,
        role: UserRole.admin,
      });
      inviteService.validateAndConsumeInvite.mockResolvedValue(UserRole.admin);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.signup(
        signupData.email,
        signupData.password,
        undefined,
        signupData.inviteToken,
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(inviteService.getInviteByToken).toHaveBeenCalledWith(signupData.inviteToken);
      expect(usersService.createUser).toHaveBeenCalledWith({
        email: signupData.email,
        passwordHash: 'hashed-password',
        fullName: undefined,
        role: UserRole.admin,
      });
      expect(inviteService.validateAndConsumeInvite).toHaveBeenCalledWith(
        signupData.inviteToken,
        mockUser.id,
      );
    });

    it('should throw UnauthorizedException if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.signup('test@example.com', 'password123')).rejects.toThrow(
        new UnauthorizedException('Email already registered'),
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if invite token is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      inviteService.getInviteByToken.mockResolvedValue(null);

      await expect(
        service.signup('newuser@example.com', 'password123', undefined, 'invalid-token'),
      ).rejects.toThrow(new UnauthorizedException('Invalid invite token'));

      expect(inviteService.getInviteByToken).toHaveBeenCalledWith('invalid-token');
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if invite token is already used', async () => {
      const usedInvite = { ...mockInvite, usedAt: new Date() };
      usersService.findByEmail.mockResolvedValue(null);
      inviteService.getInviteByToken.mockResolvedValue(usedInvite);

      await expect(
        service.signup('newuser@example.com', 'password123', undefined, 'used-token'),
      ).rejects.toThrow(new UnauthorizedException('Invite token already used'));

      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if invite token is expired', async () => {
      const expiredInvite = { ...mockInvite, expiresAt: new Date(Date.now() - 1000) };
      usersService.findByEmail.mockResolvedValue(null);
      inviteService.getInviteByToken.mockResolvedValue(expiredInvite);

      await expect(
        service.signup('newuser@example.com', 'password123', undefined, 'expired-token'),
      ).rejects.toThrow(new UnauthorizedException('Invite token expired'));

      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if invite email does not match', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      inviteService.getInviteByToken.mockResolvedValue(mockInvite);

      await expect(
        service.signup('different@example.com', 'password123', undefined, 'valid-invite-token'),
      ).rejects.toThrow(new UnauthorizedException('Invite token is for a different email'));

      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email matching for invite tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      inviteService.getInviteByToken.mockResolvedValue(mockInvite);
      usersService.createUser.mockResolvedValue({
        ...mockUser,
        email: 'INVITED@EXAMPLE.COM',
        role: UserRole.admin,
      });
      inviteService.validateAndConsumeInvite.mockResolvedValue(UserRole.admin);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      // Should not throw even though case is different
      const result = await service.signup(
        'INVITED@EXAMPLE.COM',
        'password123',
        undefined,
        'valid-invite-token',
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login('test@example.com', 'password123');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('notfound@example.com', 'password123')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith('notfound@example.com');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      expect(bcryptjs.compare).toHaveBeenCalledWith('wrongpassword', mockUser.passwordHash);
    });

    it('should throw UnauthorizedException if user account is inactive', async () => {
      const inactiveUser = { ...mockUser, active: false };
      usersService.findByEmail.mockResolvedValue(inactiveUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        new UnauthorizedException('Account is disabled'),
      );
    });

    it('should handle user with null passwordHash', async () => {
      const userWithNullPassword = { ...mockUser, passwordHash: null };
      usersService.findByEmail.mockResolvedValue(userWithNullPassword);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      expect(bcryptjs.compare).toHaveBeenCalledWith('password123', '');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      const tokenId = 'refresh-token-uuid-1';
      const userId = 'user-uuid-1';

      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      usersService.findById.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh(userId, tokenId);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({ where: { id: tokenId } });
      expect(usersService.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('user-uuid-1', 'invalid-token-id')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException if userId does not match', async () => {
      const tokenWithDifferentUser = { ...mockRefreshToken, userId: 'different-user-id' };
      prisma.refreshToken.findUnique.mockResolvedValue(tokenWithDifferentUser);

      await expect(service.refresh('user-uuid-1', 'refresh-token-uuid-1')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException if refresh token is revoked', async () => {
      const revokedToken = { ...mockRefreshToken, revokedAt: new Date() };
      prisma.refreshToken.findUnique.mockResolvedValue(revokedToken);

      await expect(service.refresh('user-uuid-1', 'refresh-token-uuid-1')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException if refresh token has expired', async () => {
      const expiredToken = { ...mockRefreshToken, expiresAt: new Date(Date.now() - 1000) };
      prisma.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.refresh('user-uuid-1', 'refresh-token-uuid-1')).rejects.toThrow(
        new UnauthorizedException('Refresh token has expired'),
      );
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh('user-uuid-1', 'refresh-token-uuid-1')).rejects.toThrow(
        new UnauthorizedException('Account is disabled'),
      );
    });

    it('should throw UnauthorizedException if user account is inactive', async () => {
      const inactiveUser = { ...mockUser, active: false };
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      usersService.findById.mockResolvedValue(inactiveUser);

      await expect(service.refresh('user-uuid-1', 'refresh-token-uuid-1')).rejects.toThrow(
        new UnauthorizedException('Account is disabled'),
      );
    });
  });

  describe('refreshWithToken', () => {
    it('should refresh tokens using JWT refresh token', async () => {
      const refreshToken = 'valid-jwt-refresh-token';
      const payload = { sub: 'user-uuid-1', jti: 'refresh-token-uuid-1' };

      jwtService.verifyAsync.mockResolvedValue(payload);
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      usersService.findById.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshWithToken(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException if JWT verification fails', async () => {
      const refreshToken = 'invalid-jwt-token';
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshWithToken(refreshToken)).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout successfully and revoke refresh token', async () => {
      const refreshToken = 'valid-jwt-refresh-token';
      const payload = { sub: 'user-uuid-1', jti: 'refresh-token-uuid-1' };

      jwtService.verifyAsync.mockResolvedValue(payload);
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.update.mockResolvedValue({ ...mockRefreshToken, revokedAt: new Date() });

      const result = await service.logout(refreshToken);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: payload.jti },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException if refresh token not found in DB', async () => {
      const refreshToken = 'valid-jwt-refresh-token';
      const payload = { sub: 'user-uuid-1', jti: 'refresh-token-uuid-1' };

      jwtService.verifyAsync.mockResolvedValue(payload);
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.logout(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should throw UnauthorizedException if JWT verification fails', async () => {
      const refreshToken = 'invalid-jwt-token';
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.logout(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully and revoke all refresh tokens', async () => {
      const userId = 'user-uuid-1';
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword456';

      usersService.findById.mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue({ ...mockUser, passwordHash: 'new-hashed-password' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.changePassword(userId, currentPassword, newPassword);

      expect(result).toEqual({
        message: 'Password changed successfully. Please login again.',
      });
      expect(usersService.findById).toHaveBeenCalledWith(userId);
      expect(bcryptjs.compare).toHaveBeenCalledWith(currentPassword, mockUser.passwordHash);
      expect(bcryptjs.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'new-hashed-password' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('invalid-user-id', 'oldPassword', 'newPassword'),
      ).rejects.toThrow(new UnauthorizedException('User not found'));

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-uuid-1', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(new UnauthorizedException('Current password is incorrect'));

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('should handle user with null passwordHash', async () => {
      const userWithNullPassword = { ...mockUser, passwordHash: null };
      usersService.findById.mockResolvedValue(userWithNullPassword);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-uuid-1', 'currentPassword', 'newPassword'),
      ).rejects.toThrow(new UnauthorizedException('Current password is incorrect'));

      expect(bcryptjs.compare).toHaveBeenCalledWith('currentPassword', '');
    });
  });

  describe('issueTokens (via login/signup)', () => {
    it('should create refresh token with correct TTL from environment', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.login('test@example.com', 'password123');

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          userEmail: mockUser.email,
          userRole: mockUser.role,
          expiresAt: expect.any(Date),
        },
      });

      // Verify JWT was signed with correct parameters
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: 'test-access-secret', expiresIn: '900s' },
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, jti: mockRefreshToken.id },
        { secret: 'test-refresh-secret', expiresIn: '7d' },
      );
    });

    it('should parse TTL correctly for different time units', async () => {
      // Test is implicit - the parseTtl method is private but used in issueTokens
      // We verify it works by checking the expiresAt date is reasonable
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);

      let capturedExpiresAt: Date | null = null;
      prisma.refreshToken.create.mockImplementation((args: any) => {
        capturedExpiresAt = args.data.expiresAt;
        return Promise.resolve(mockRefreshToken);
      });

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.login('test@example.com', 'password123');

      expect(capturedExpiresAt).toBeDefined();
      // 7 days in milliseconds
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expectedTime = Date.now() + sevenDaysMs;
      // Allow 1 second tolerance for test execution time
      expect(capturedExpiresAt!.getTime()).toBeGreaterThan(expectedTime - 1000);
      expect(capturedExpiresAt!.getTime()).toBeLessThan(expectedTime + 1000);
    });
  });

  describe('edge cases and security', () => {
    it('should not expose user information in error messages', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      try {
        await service.login('test@example.com', 'password');
      } catch (error: any) {
        expect(error.message).toBe('Invalid credentials');
        expect(error.message).not.toContain('test@example.com');
      }
    });

    it('should hash passwords with bcrypt and salt rounds of 10', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.createUser.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.signup('newuser@example.com', 'password123');

      expect(bcryptjs.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should validate refresh token exists in database even if JWT is valid', async () => {
      const refreshToken = 'valid-jwt-refresh-token';
      const payload = { sub: 'user-uuid-1', jti: 'non-existent-token-id' };

      jwtService.verifyAsync.mockResolvedValue(payload);
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.logout(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('should handle different user roles correctly in signup with invite', async () => {
      const roles = [UserRole.admin, UserRole.manager, UserRole.warehouse_staff];

      for (const role of roles) {
        const invite = { ...mockInvite, role };
        usersService.findByEmail.mockResolvedValue(null);
        inviteService.getInviteByToken.mockResolvedValue(invite);
        usersService.createUser.mockResolvedValue({ ...mockUser, role });
        inviteService.validateAndConsumeInvite.mockResolvedValue(role);
        prisma.refreshToken.create.mockResolvedValue({ ...mockRefreshToken, userRole: role });
        jwtService.signAsync
          .mockResolvedValueOnce('access-token')
          .mockResolvedValueOnce('refresh-token');

        const result = await service.signup(
          'invited@example.com',
          'password',
          undefined,
          'invite-token',
        );

        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(usersService.createUser).toHaveBeenCalledWith(expect.objectContaining({ role }));

        jest.clearAllMocks();
      }
    });
  });
});
