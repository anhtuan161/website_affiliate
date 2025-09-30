import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { generateTokens, refreshAccessToken } from '../middleware/auth';
import { AuthenticatedRequest, ApiResponse, LoginRequest, RegisterRequest, AuthResponse, Role } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * User login endpoint
 * Endpoint đăng nhập người dùng
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req: express.Request, res: express.Response<ApiResponse<AuthResponse>>) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email, password, rememberMe }: LoginRequest = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive'
        }
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Return user data and tokens
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      refreshToken
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'LOGIN_ERROR',
        message: 'An error occurred during login'
      }
    });
  }
});

/**
 * POST /api/auth/register
 * User registration endpoint
 * Endpoint đăng ký người dùng
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').isIn(['ADMIN', 'STAFF', 'MEMBER', 'OWNER']).withMessage('Valid role is required'),
], async (req: express.Request, res: express.Response<ApiResponse<AuthResponse>>) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email, password, name, role }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Return user data and tokens
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      refreshToken
    };

    res.status(201).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'An error occurred during registration'
      }
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token endpoint
 * Endpoint làm mới access token
 */
router.post('/refresh', async (req: express.Request, res: express.Response<ApiResponse<{ accessToken: string }>>) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }

    // Refresh access token
    const { accessToken } = await refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: { accessToken }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token'
      }
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout endpoint (client-side token removal)
 * Endpoint đăng xuất người dùng (xóa token ở phía client)
 */
router.post('/logout', (req: express.Request, res: express.Response<ApiResponse>) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing tokens from storage
  res.json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 * Lấy thông tin người dùng hiện tại
 */
router.get('/me', async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: {
        code: 'USER_INFO_ERROR',
        message: 'An error occurred while fetching user info'
      }
    });
  }
});

export default router;
