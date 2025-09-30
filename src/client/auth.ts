// Authentication management module
// Module quản lý xác thực

import { authApi, TokenManager } from './api';
import { User, LoginFormData, RegisterFormData, AppState } from './types';

class AuthManager {
  private state: AppState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  };

  private listeners: Array<(state: AppState) => void> = [];

  constructor() {
    this.initializeAuth();
  }

  // Initialize authentication state from stored tokens
  // Khởi tạo trạng thái xác thực từ token đã lưu
  private async initializeAuth(): Promise<void> {
    this.setState({ isLoading: true });

    const accessToken = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();

    if (!accessToken || !refreshToken) {
      this.setState({ 
        isLoading: false, 
        isAuthenticated: false, 
        user: null 
      });
      return;
    }

    // Check if access token is expired
    if (TokenManager.isTokenExpired(accessToken)) {
      // Try to refresh token
      try {
        const response = await authApi.logout();
        if (response.success) {
          TokenManager.clearTokens();
        }
      } catch (error) {
        console.error('Error during token refresh:', error);
      }
      
      this.setState({ 
        isLoading: false, 
        isAuthenticated: false, 
        user: null 
      });
      return;
    }

    // Get current user info
    try {
      const response = await authApi.getCurrentUser();
      if (response.success && response.data?.user) {
        this.setState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        this.setState({ 
          isLoading: false, 
          isAuthenticated: false, 
          user: null,
          error: response.error?.message || 'Failed to get user info'
        });
      }
    } catch (error) {
      console.error('Error getting user info:', error);
      this.setState({ 
        isLoading: false, 
        isAuthenticated: false, 
        user: null,
        error: 'Failed to get user info'
      });
    }
  }

  // Set state and notify listeners
  // Cập nhật state và thông báo cho listeners
  private setState(newState: Partial<AppState>): void {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  // Subscribe to state changes
  // Đăng ký lắng nghe thay đổi state
  public subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current state
  // Lấy state hiện tại
  public getState(): AppState {
    return { ...this.state };
  }

  // Login user
  // Đăng nhập người dùng
  public async login(credentials: LoginFormData): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await authApi.login(credentials);
      
      if (response.success && response.data) {
        // Store tokens
        TokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
        
        // Update state
        this.setState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });

        return { success: true };
      } else {
        this.setState({
          isLoading: false,
          error: response.error?.message || 'Login failed'
        });
        return { success: false, error: response.error?.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      this.setState({
        isLoading: false,
        error: 'Network error during login'
      });
      return { success: false, error: 'Network error during login' };
    }
  }

  // Register user
  // Đăng ký người dùng
  public async register(userData: RegisterFormData): Promise<{ success: boolean; error?: string }> {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await authApi.register(userData);
      
      if (response.success && response.data) {
        // Store tokens
        TokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
        
        // Update state
        this.setState({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });

        return { success: true };
      } else {
        this.setState({
          isLoading: false,
          error: response.error?.message || 'Registration failed'
        });
        return { success: false, error: response.error?.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.setState({
        isLoading: false,
        error: 'Network error during registration'
      });
      return { success: false, error: 'Network error during registration' };
    }
  }

  // Logout user
  // Đăng xuất người dùng
  public async logout(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and reset state
      TokenManager.clearTokens();
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }

  // Check if user has specific role
  // Kiểm tra người dùng có quyền cụ thể
  public hasRole(role: string): boolean {
    return this.state.user?.role === role;
  }

  // Check if user has any of the specified roles
  // Kiểm tra người dùng có bất kỳ quyền nào trong danh sách
  public hasAnyRole(roles: string[]): boolean {
    return this.state.user ? roles.includes(this.state.user.role) : false;
  }

  // Check if user is admin
  // Kiểm tra người dùng có phải admin
  public isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  // Check if user is staff or admin
  // Kiểm tra người dùng có phải staff hoặc admin
  public isStaff(): boolean {
    return this.hasAnyRole(['ADMIN', 'STAFF']);
  }

  // Check if user can view posts
  // Kiểm tra người dùng có thể xem bài viết
  public canViewPosts(): boolean {
    return this.hasAnyRole(['ADMIN', 'STAFF', 'MEMBER', 'OWNER']);
  }

  // Check if user can create/edit posts
  // Kiểm tra người dùng có thể tạo/sửa bài viết
  public canManagePosts(): boolean {
    return this.hasAnyRole(['ADMIN', 'STAFF']);
  }

  // Check if user can manage users
  // Kiểm tra người dùng có thể quản lý người dùng
  public canManageUsers(): boolean {
    return this.hasRole('ADMIN');
  }

  // Get redirect URL based on user role
  // Lấy URL chuyển hướng dựa trên quyền người dùng
  public getRedirectUrl(): string {
    if (!this.state.user) return '/login.html';

    switch (this.state.user.role) {
      case 'ADMIN':
        return '/admin-dashboard.html';
      case 'STAFF':
        return '/employee-dashboard.html';
      case 'MEMBER':
        return '/collaborator-dashboard.html';
      case 'OWNER':
        return '/owner-dashboard.html';
      default:
        return '/login.html';
    }
  }
}

// Create singleton instance
// Tạo instance singleton
const authManager = new AuthManager();

export default authManager;
