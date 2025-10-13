import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Placeholder: allow all for now. Extend with metadata-based role checks later.
    void context; // intentionally unused until role metadata is implemented
    return true;
  }
}
