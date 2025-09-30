import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireStaff, requireAdmin } from '../middleware/auth';
import { AuthenticatedRequest, ApiResponse, CreatePostRequest, UpdatePostRequest, PostStatus } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/posts
 * Get all posts (with role-based filtering)
 * Lấy danh sách tất cả bài viết (có lọc theo quyền)
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('Invalid status filter'),
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
    const status = req.query.status as PostStatus;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: any = {};
    
    // MEMBER role can only see published posts
    if (req.user?.role === 'MEMBER') {
      where.status = 'PUBLISHED';
    }
    
    // Add status filter if provided
    if (status) {
      where.status = status;
    }
    
    // Add search filter if provided
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      error: {
        code: 'GET_POSTS_ERROR',
        message: 'An error occurred while fetching posts'
      }
    });
  }
});

/**
 * GET /api/posts/:id
 * Get post by ID
 * Lấy thông tin bài viết theo ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found'
        }
      });
    }

    // MEMBER role can only see published posts
    if (req.user?.role === 'MEMBER' && post.status !== 'PUBLISHED') {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only view published posts'
        }
      });
    }

    res.json({
      success: true,
      data: { post }
    });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      error: {
        code: 'GET_POST_ERROR',
        message: 'An error occurred while fetching post'
      }
    });
  }
});

/**
 * POST /api/posts
 * Create new post (Staff and Admin only)
 * Tạo bài viết mới (chỉ Staff và Admin)
 */
router.post('/', requireStaff, [
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').isLength({ min: 1 }).withMessage('Content is required'),
  body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('Invalid status'),
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

    const { title, content, status = 'DRAFT' }: CreatePostRequest = req.body;

    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        status: status as PostStatus,
        authorId: req.user?.id,
        createdById: req.user?.id
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { post }
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_POST_ERROR',
        message: 'An error occurred while creating post'
      }
    });
  }
});

/**
 * PUT /api/posts/:id
 * Update post (Staff and Admin only)
 * Cập nhật bài viết (chỉ Staff và Admin)
 */
router.put('/:id', requireStaff, [
  body('title').optional().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').optional().isLength({ min: 1 }).withMessage('Content cannot be empty'),
  body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']).withMessage('Invalid status'),
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
    const { title, content, status }: UpdatePostRequest = req.body;

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        createdById: true
      }
    });

    if (!existingPost) {
      return res.status(404).json({
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found'
        }
      });
    }

    // Check permissions: Staff can only edit their own posts, Admin can edit any
    if (req.user?.role === 'STAFF' && existingPost.authorId !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only edit your own posts'
        }
      });
    }

    // Update post
    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(status !== undefined && { status: status as PostStatus })
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { post }
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_POST_ERROR',
        message: 'An error occurred while updating post'
      }
    });
  }
});

/**
 * DELETE /api/posts/:id
 * Delete post (Admin only)
 * Xóa bài viết (chỉ Admin)
 */
router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: express.Response<ApiResponse>) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id }
    });

    if (!existingPost) {
      return res.status(404).json({
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found'
        }
      });
    }

    // Delete post
    await prisma.post.delete({
      where: { id }
    });

    res.json({
      success: true,
      data: { message: 'Post deleted successfully' }
    });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_POST_ERROR',
        message: 'An error occurred while deleting post'
      }
    });
  }
});

export default router;
