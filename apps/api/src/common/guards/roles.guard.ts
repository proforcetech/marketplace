/**
 * Role-Based Access Control (RBAC) Guard
 *
 * Enforces role requirements on controller methods using the @Roles() decorator.
 * Must be used after AuthGuard in the guard chain (depends on request.user being populated).
 *
 * Supports:
 * - Single role requirement: @Roles('admin')
 * - Multiple roles (OR logic): @Roles('admin', 'moderator')
 * - Role hierarchy: admin implicitly has moderator and user permissions
 * - Permission-based checks via @RequirePermissions() for fine-grained control
 *
 * Performance: O(1) role lookup using Set. No database queries -- roles are in the JWT.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// ─── Role Definitions ─────────────────────────────────────────

export enum Role {
  USER = 'user',
  VERIFIED_SELLER = 'verified_seller',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * Role hierarchy: each role inherits all permissions of roles below it.
 * Lookup is O(1) via Set.
 */
const ROLE_HIERARCHY: Record<Role, Set<Role>> = {
  [Role.USER]: new Set([Role.USER]),
  [Role.VERIFIED_SELLER]: new Set([Role.USER, Role.VERIFIED_SELLER]),
  [Role.MODERATOR]: new Set([Role.USER, Role.MODERATOR]),
  [Role.ADMIN]: new Set([
    Role.USER,
    Role.VERIFIED_SELLER,
    Role.MODERATOR,
    Role.ADMIN,
  ]),
  [Role.SUPER_ADMIN]: new Set([
    Role.USER,
    Role.VERIFIED_SELLER,
    Role.MODERATOR,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ]),
};

// ─── Permissions ──────────────────────────────────────────────

export enum Permission {
  // Listings
  LISTING_CREATE = 'listing:create',
  LISTING_EDIT_OWN = 'listing:edit:own',
  LISTING_DELETE_OWN = 'listing:delete:own',
  LISTING_EDIT_ANY = 'listing:edit:any',
  LISTING_DELETE_ANY = 'listing:delete:any',
  LISTING_APPROVE = 'listing:approve',
  LISTING_REJECT = 'listing:reject',

  // Users
  USER_VIEW_PROFILE = 'user:view:profile',
  USER_EDIT_OWN = 'user:edit:own',
  USER_BAN = 'user:ban',
  USER_SUSPEND = 'user:suspend',
  USER_SHADOW_BAN = 'user:shadow_ban',
  USER_VIEW_PII = 'user:view:pii',
  USER_MANAGE_ROLES = 'user:manage:roles',

  // Messaging
  MESSAGE_SEND = 'message:send',
  MESSAGE_VIEW_ANY = 'message:view:any',

  // Moderation
  MOD_QUEUE_VIEW = 'mod:queue:view',
  MOD_QUEUE_ACTION = 'mod:queue:action',
  MOD_REPORTS_VIEW = 'mod:reports:view',

  // Admin
  ADMIN_AUDIT_LOG = 'admin:audit_log',
  ADMIN_ANALYTICS = 'admin:analytics',
  ADMIN_CONFIG = 'admin:config',
  ADMIN_DATA_EXPORT = 'admin:data_export',
}

/**
 * Map roles to their granted permissions.
 * Each role's permissions are the union of its own grants and inherited role grants.
 */
const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  [Role.USER]: new Set([
    Permission.LISTING_CREATE,
    Permission.LISTING_EDIT_OWN,
    Permission.LISTING_DELETE_OWN,
    Permission.USER_VIEW_PROFILE,
    Permission.USER_EDIT_OWN,
    Permission.MESSAGE_SEND,
  ]),
  [Role.VERIFIED_SELLER]: new Set([
    Permission.LISTING_CREATE,
    Permission.LISTING_EDIT_OWN,
    Permission.LISTING_DELETE_OWN,
    Permission.USER_VIEW_PROFILE,
    Permission.USER_EDIT_OWN,
    Permission.MESSAGE_SEND,
  ]),
  [Role.MODERATOR]: new Set([
    Permission.LISTING_CREATE,
    Permission.LISTING_EDIT_OWN,
    Permission.LISTING_DELETE_OWN,
    Permission.LISTING_EDIT_ANY,
    Permission.LISTING_DELETE_ANY,
    Permission.LISTING_APPROVE,
    Permission.LISTING_REJECT,
    Permission.USER_VIEW_PROFILE,
    Permission.USER_EDIT_OWN,
    Permission.USER_SUSPEND,
    Permission.USER_SHADOW_BAN,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_VIEW_ANY,
    Permission.MOD_QUEUE_VIEW,
    Permission.MOD_QUEUE_ACTION,
    Permission.MOD_REPORTS_VIEW,
  ]),
  [Role.ADMIN]: new Set([
    Permission.LISTING_CREATE,
    Permission.LISTING_EDIT_OWN,
    Permission.LISTING_DELETE_OWN,
    Permission.LISTING_EDIT_ANY,
    Permission.LISTING_DELETE_ANY,
    Permission.LISTING_APPROVE,
    Permission.LISTING_REJECT,
    Permission.USER_VIEW_PROFILE,
    Permission.USER_EDIT_OWN,
    Permission.USER_BAN,
    Permission.USER_SUSPEND,
    Permission.USER_SHADOW_BAN,
    Permission.USER_VIEW_PII,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_VIEW_ANY,
    Permission.MOD_QUEUE_VIEW,
    Permission.MOD_QUEUE_ACTION,
    Permission.MOD_REPORTS_VIEW,
    Permission.ADMIN_AUDIT_LOG,
    Permission.ADMIN_ANALYTICS,
  ]),
  [Role.SUPER_ADMIN]: new Set(Object.values(Permission)),
};

// ─── Decorators ───────────────────────────────────────────────

export const ROLES_KEY = 'roles';

/**
 * Decorator to require one or more roles on a controller method.
 * If multiple roles are specified, the user needs at least ONE of them (OR logic).
 *
 * @example
 * @Roles(Role.ADMIN, Role.MODERATOR)
 * @Get('moderation/queue')
 * getModerationQueue() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions on a controller method.
 * All specified permissions must be satisfied (AND logic).
 *
 * @example
 * @RequirePermissions(Permission.LISTING_APPROVE, Permission.MOD_QUEUE_ACTION)
 * @Post('listings/:id/approve')
 * approveListing() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// ─── Guard Implementation ─────────────────────────────────────

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator (if any)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get required permissions from decorator (if any)
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions are required, allow access
    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      // This should not happen if AuthGuard runs first, but guard against it
      throw new ForbiddenException('Authentication required');
    }

    const userRoles = user.roles.map((r) => r as Role);

    // Check role requirement (OR: user needs at least one of the required roles)
    if (requiredRoles?.length) {
      const hasRole = this.checkRoles(userRoles, requiredRoles);
      if (!hasRole) {
        this.logger.warn(
          `Access denied: user=${user.userId} has roles=[${userRoles.join(',')}], ` +
            `required one of=[${requiredRoles.join(',')}]`,
        );
        throw new ForbiddenException('Insufficient role');
      }
    }

    // Check permission requirement (AND: user needs ALL required permissions)
    if (requiredPermissions?.length) {
      const hasPermissions = this.checkPermissions(
        userRoles,
        requiredPermissions,
      );
      if (!hasPermissions) {
        this.logger.warn(
          `Access denied: user=${user.userId} lacks required permissions: ` +
            `[${requiredPermissions.join(',')}]`,
        );
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }

  /**
   * Check if the user's roles (considering hierarchy) satisfy at least one required role.
   */
  private checkRoles(userRoles: Role[], requiredRoles: Role[]): boolean {
    for (const userRole of userRoles) {
      const effectiveRoles = ROLE_HIERARCHY[userRole];
      if (!effectiveRoles) {
        continue;
      }
      for (const requiredRole of requiredRoles) {
        if (effectiveRoles.has(requiredRole)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if the user's roles grant ALL required permissions.
   */
  private checkPermissions(
    userRoles: Role[],
    requiredPermissions: Permission[],
  ): boolean {
    // Collect all permissions the user has across all their roles
    const userPermissions = new Set<Permission>();
    for (const role of userRoles) {
      const rolePerms = ROLE_PERMISSIONS[role];
      if (rolePerms) {
        for (const perm of rolePerms) {
          userPermissions.add(perm);
        }
      }
    }

    // Check that every required permission is in the user's permission set
    for (const required of requiredPermissions) {
      if (!userPermissions.has(required)) {
        return false;
      }
    }

    return true;
  }
}

// ─── Utility Functions ────────────────────────────────────────

/**
 * Get all effective permissions for a set of roles.
 * Useful for debugging and for returning user capabilities in profile responses.
 */
export function getEffectivePermissions(roles: Role[]): Permission[] {
  const permissions = new Set<Permission>();
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (rolePerms) {
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }
  }
  return Array.from(permissions);
}

/**
 * Check if a given role has a specific permission.
 * Useful in service-layer authorization checks.
 */
export function roleHasPermission(
  role: Role,
  permission: Permission,
): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.has(permission) : false;
}
