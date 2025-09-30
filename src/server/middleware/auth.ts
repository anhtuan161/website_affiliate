import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import { AuthenticatedRequest, JWTPayload, ApiResponse } from '../types';

const prisma = new PrismaClient();

// JWT secret keys
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Generate access and refresh tokens for a user
 * Tạo access và refresh token cho người dùng
 */
export const generateTokens = (user: { id: string; email: string; role: Role }) => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256'
  });
  
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { 
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256'
  });

  return { accessToken, refreshToken };
};

/**
 * Verify access token and attach user to request
 * Xác thực access token và gắn thông tin user vào request
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_SECRET) as JWTPayload;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
    }

    // Attach user to request
    req.user = user as any;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error'
      }
    });
  }
};

/**
 * Check if user has required role
 * Kiểm tra quyền hạn của người dùng
 */
export const requireRole = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action'
        }
      });
    }

    next();
  };
};

/**
 * Refresh access token using refresh token
 * Làm mới access token bằng refresh token
 */
export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return generateTokens(user);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Admin only middleware
 * Middleware chỉ dành cho admin
 */
export const requireAdmin = requireRole([Role.ADMIN]);

/**
 * Staff and Admin middleware
 * Middleware cho staff và admin
 */
export const requireStaff = requireRole([Role.ADMIN, Role.STAFF]);

/**
 * All authenticated users middleware
 * Middleware cho tất cả user đã đăng nhập
 */
export const requireAuth = requireRole([Role.ADMIN, Role.STAFF, Role.MEMBER, Role.OWNER]);
