import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin, requireStaff } from '../middleware/auth';
import { AuthenticatedRequest, ApiResponse, CreateUserRequest, UpdateUserRequest, Role } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/users
 * Get all users (Admin only)
 * Lấy danh sách tất cả người dùng (chỉ Admin)
 */
router.get('/', requireAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['ADMIN', 'STAFF', 'MEMBER', 'OWNER']).withMessage('Invalid role filter'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term must not be empty'),
], async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array()
        }
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const role = req.query.role as Role;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: {
        code: 'GET_USERS_ERROR',
        message: 'An error occurred while fetching users'
      }
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID (Admin only)
 * Lấy thông tin người dùng theo ID (chỉ Admin)
 */
router.get('/:id', requireAdmin, async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        posts: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: {
        code: 'GET_USER_ERROR',
        message: 'An error occurred while fetching user'
      }
    });
  }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 * Tạo người dùng mới (chỉ Admin)
 */
router.post('/', requireAdmin, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').isIn(['ADMIN', 'STAFF', 'MEMBER', 'OWNER']).withMessage('Valid role is required'),
], async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
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

    const { email, password, name, role }: CreateUserRequest = req.body;

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
    const bcrypt = require('bcryptjs');
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
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_USER_ERROR',
        message: 'An error occurred while creating user'
      }
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user (Admin only)
 * Cập nhật thông tin người dùng (chỉ Admin)
 */
router.put('/:id', requireAdmin, [
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').optional().isIn(['ADMIN', 'STAFF', 'MEMBER', 'OWNER']).withMessage('Valid role is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
], async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
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

    const { id } = req.params;
    const { name, role, isActive }: UpdateUserRequest = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive })
      },
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

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_USER_ERROR',
        message: 'An error occurred while updating user'
      }
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 * Xóa người dùng (chỉ Admin)
 */
router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Prevent admin from deleting themselves
    if (id === req.user?.id) {
      return res.status(400).json({
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'Cannot delete your own account'
        }
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    res.json({
      success: true,
      data: { message: 'User deleted successfully' }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_USER_ERROR',
        message: 'An error occurred while deleting user'
      }
    });
  }
});

export default router;
