import { Request } from 'express';
import { User } from '@prisma/client';

// Define role types as string literals
export type Role = 'ADMIN' | 'STAFF' | 'MEMBER' | 'OWNER';
export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// Extended Request interface with user data
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// User management interfaces
export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  role: Role;
}

export interface UpdateUserRequest {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

// Post management interfaces
export interface CreatePostRequest {
  title: string;
  content: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

// Authentication interfaces
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  role: Role;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
  accessToken: string;
  refreshToken: string;
}
