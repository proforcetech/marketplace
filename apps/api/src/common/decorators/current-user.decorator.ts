/**
 * CurrentUser Parameter Decorator
 *
 * Extracts the authenticated user from the request object.
 * Depends on AuthGuard having already populated request.user.
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser('userId') userId: string) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../guards/auth.guard';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
