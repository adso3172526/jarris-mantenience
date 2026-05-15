import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No decorators = public endpoint
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // ADMIN = superuser, full access to everything
    if (user.roles?.includes('ADMIN')) {
      return true;
    }

    // For all non-ADMIN users: only check permissions from profile
    if (
      requiredPermissions &&
      requiredPermissions.length > 0 &&
      user.permissions?.length > 0
    ) {
      if (requiredPermissions.some((perm) => user.permissions.includes(perm))) {
        return true;
      }
    }

    return false;
  }
}
