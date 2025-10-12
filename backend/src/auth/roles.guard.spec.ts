import { ExecutionContext, ForbiddenException, ArgumentsHost } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (role?: UserRole): ExecutionContext => {
    const request = { user: role ? { role } : undefined } as const;
    const handler: (...args: unknown[]) => unknown = () => undefined;
    class Dummy {}

    const httpHost = {
      getRequest: <T = unknown>() => request as unknown as T,
      getResponse: <T = unknown>() => ({}) as T,
      getNext: <T = unknown>() => ({}) as T,
    };

    const ctx: ExecutionContext = {
      switchToHttp: () => httpHost as unknown as ArgumentsHost,
      getHandler: () => handler,
      getClass: () => Dummy as unknown as any,
      getArgs: () => [] as any,
      getArgByIndex: () => undefined as any,
      switchToRpc: () => {
        throw new Error('switchToRpc not used');
      },
      switchToWs: () => {
        throw new Error('switchToWs not used');
      },
      getType: () => 'http' as any,
    } as unknown as ExecutionContext;

    return ctx;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles metadata', () => {
    const ctx = createMockContext(UserRole.admin);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined as any);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws when missing user role', () => {
    const ctx = createMockContext(undefined);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.admin]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows when user role is included', () => {
    const ctx = createMockContext(UserRole.manager);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.admin, UserRole.manager]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when user role is not included', () => {
    const ctx = createMockContext(UserRole.partner);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.manager]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
