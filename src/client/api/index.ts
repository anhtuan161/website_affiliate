// API client for making HTTP requests
// Client API để thực hiện các yêu cầu HTTP

import { 
  ApiResponse, 
  AuthResponse, 
  LoginFormData, 
  RegisterFormData, 
  PostsResponse, 
  UsersResponse,
  CreatePostFormData,
  UpdatePostFormData,
  User,
  Post
} from '../types';

const API_BASE_URL = '/api';

// Token management
// Quản lý token
class TokenManager {
  private static ACCESS_TOKEN_KEY = 'affiliate_access_token';
  private static REFRESH_TOKEN_KEY = 'affiliate_refresh_token';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

// HTTP client with automatic token refresh
// Client HTTP với tự động làm mới token
class HttpClient {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const accessToken = TokenManager.getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken && !TokenManager.isTokenExpired(accessToken)) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      // Handle token expiration
      if (response.status === 401 && data.error?.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request with new token
          const newAccessToken = TokenManager.getAccessToken();
          if (newAccessToken) {
            headers.Authorization = `Bearer ${newAccessToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
            });
            return await retryResponse.json();
          }
        }
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network request failed'
        }
      };
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      const data: ApiResponse<{ accessToken: string }> = await response.json();
      
      if (data.success && data.data?.accessToken) {
        TokenManager.setTokens(data.data.accessToken, refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }
}

const httpClient = new HttpClient();

// Authentication API
// API xác thực
export const authApi = {
  // Login user
  // Đăng nhập người dùng
  async login(credentials: LoginFormData): Promise<ApiResponse<AuthResponse>> {
    return httpClient.post<AuthResponse>('/auth/login', credentials);
  },

  // Register user
  // Đăng ký người dùng
  async register(userData: RegisterFormData): Promise<ApiResponse<AuthResponse>> {
    return httpClient.post<AuthResponse>('/auth/register', userData);
  },

  // Get current user info
  // Lấy thông tin người dùng hiện tại
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return httpClient.get<{ user: User }>('/auth/me');
  },

  // Logout user
  // Đăng xuất người dùng
  async logout(): Promise<ApiResponse> {
    const result = await httpClient.post('/auth/logout');
    TokenManager.clearTokens();
    return result;
  }
};

// Posts API
// API bài viết
export const postsApi = {
  // Get all posts
  // Lấy tất cả bài viết
  async getPosts(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<PostsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = queryParams.toString() 
      ? `/posts?${queryParams.toString()}` 
      : '/posts';
    
    return httpClient.get<PostsResponse>(endpoint);
  },

  // Get post by ID
  // Lấy bài viết theo ID
  async getPost(id: string): Promise<ApiResponse<{ post: Post }>> {
    return httpClient.get<{ post: Post }>(`/posts/${id}`);
  },

  // Create new post
  // Tạo bài viết mới
  async createPost(postData: CreatePostFormData): Promise<ApiResponse<{ post: Post }>> {
    return httpClient.post<{ post: Post }>('/posts', postData);
  },

  // Update post
  // Cập nhật bài viết
  async updatePost(id: string, postData: UpdatePostFormData): Promise<ApiResponse<{ post: Post }>> {
    return httpClient.put<{ post: Post }>(`/posts/${id}`, postData);
  },

  // Delete post
  // Xóa bài viết
  async deletePost(id: string): Promise<ApiResponse> {
    return httpClient.delete(`/posts/${id}`);
  }
};

// Users API
// API người dùng
export const usersApi = {
  // Get all users (Admin only)
  // Lấy tất cả người dùng (chỉ Admin)
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<ApiResponse<UsersResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = queryParams.toString() 
      ? `/users?${queryParams.toString()}` 
      : '/users';
    
    return httpClient.get<UsersResponse>(endpoint);
  },

  // Get user by ID
  // Lấy người dùng theo ID
  async getUser(id: string): Promise<ApiResponse<{ user: User }>> {
    return httpClient.get<{ user: User }>(`/users/${id}`);
  },

  // Create new user (Admin only)
  // Tạo người dùng mới (chỉ Admin)
  async createUser(userData: {
    email: string;
    password: string;
    name?: string;
    role: 'ADMIN' | 'STAFF' | 'MEMBER' | 'OWNER';
  }): Promise<ApiResponse<{ user: User }>> {
    return httpClient.post<{ user: User }>('/users', userData);
  },

  // Update user (Admin only)
  // Cập nhật người dùng (chỉ Admin)
  async updateUser(id: string, userData: {
    name?: string;
    role?: 'ADMIN' | 'STAFF' | 'MEMBER' | 'OWNER';
    isActive?: boolean;
  }): Promise<ApiResponse<{ user: User }>> {
    return httpClient.put<{ user: User }>(`/users/${id}`, userData);
  },

  // Delete user (Admin only)
  // Xóa người dùng (chỉ Admin)
  async deleteUser(id: string): Promise<ApiResponse> {
    return httpClient.delete(`/users/${id}`);
  }
};

// Health check API
// API kiểm tra sức khỏe
export const healthApi = {
  async check(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return httpClient.get<{ status: string; timestamp: string }>('/health');
  }
};

export { TokenManager };
