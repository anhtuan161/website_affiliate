// Frontend type definitions
// Định nghĩa kiểu dữ liệu cho frontend

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'STAFF' | 'MEMBER' | 'OWNER';
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string | null;
    email: string;
  };
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PostsResponse {
  posts: Post[];
  pagination: PaginationInfo;
}

export interface UsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

// Form interfaces
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
  role: 'ADMIN' | 'STAFF' | 'MEMBER' | 'OWNER';
  terms: boolean;
}

export interface CreatePostFormData {
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface UpdatePostFormData {
  title?: string;
  content?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

// UI State interfaces
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface DashboardStats {
  totalUsers?: number;
  totalPosts?: number;
  totalRevenue?: number;
  totalAffiliates?: number;
}
