/**
 * Auth Guard Middleware
 *
 * If CONNECTOR_STRIPE_AUTH_TOKEN is set, validates:
 * - Authorization: Bearer <token>
 * - x-connector-token: <token>
 *
 * If not set, allows all requests (dev mode)
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  orgId?: string;
}

export function authGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const expectedToken = process.env.CONNECTOR_STRIPE_AUTH_TOKEN;

  // If no token configured, allow all (dev mode)
  if (!expectedToken) {
    // In dev mode, use a placeholder org ID
    req.orgId = req.headers['x-org-id'] as string || 'dev-org';
    console.warn('Auth guard bypassed - CONNECTOR_STRIPE_AUTH_TOKEN not set');
    next();
    return;
  }

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === expectedToken) {
      req.orgId = req.headers['x-org-id'] as string || 'authenticated-org';
      next();
      return;
    }
  }

  // Check x-connector-token header
  const connectorToken = req.headers['x-connector-token'] as string;
  if (connectorToken === expectedToken) {
    req.orgId = req.headers['x-org-id'] as string || 'authenticated-org';
    next();
    return;
  }

  // Unauthorized
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
    timestamp: new Date().toISOString(),
  });
}
