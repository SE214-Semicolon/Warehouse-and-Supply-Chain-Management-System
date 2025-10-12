import { ExecutionContext, ForbiddenException } from '@nestjs/common';
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
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    };

    const ctx: ExecutionContext = {
      switchToHttp: () => httpHost as unknown as ReturnType<ExecutionContext['switchToHttp']>,
      getHandler: () => handler,
      getClass: () => Dummy as unknown as ReturnType<ExecutionContext['getClass']>,
      getArgs: (() => {
        throw new Error('getArgs not used');
      }) as unknown as ExecutionContext['getArgs'],
      getArgByIndex: (() => {
        throw new Error('getArgByIndex not used');
      }) as unknown as ExecutionContext['getArgByIndex'],
      switchToRpc: () =>
        ({
          getContext: () => ({}),
          getData: () => ({}),
        }) as unknown as ReturnType<ExecutionContext['switchToRpc']>,
      switchToWs: () =>
        ({
          getClient: () => ({}),
          getData: () => ({}),
          getPattern: () => ({}),
        }) as unknown as ReturnType<ExecutionContext['switchToWs']>,
      getType: () => 'http' as unknown as ReturnType<ExecutionContext['getType']>,
    };

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
