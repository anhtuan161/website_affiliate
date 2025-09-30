// UI management utilities
// Tiện ích quản lý giao diện

import authManager from './auth';
import { postsApi, usersApi } from './api';
import { Post, User, CreatePostFormData, UpdatePostFormData } from './types';

// DOM utilities
// Tiện ích DOM
export class DOMUtils {
  // Get element by ID with error handling
  // Lấy element theo ID với xử lý lỗi
  static getElementById<T extends HTMLElement>(id: string): T | null {
    const element = document.getElementById(id) as T;
    if (!element) {
      console.warn(`Element with id "${id}" not found`);
    }
    return element;
  }

  // Get element by selector with error handling
  // Lấy element theo selector với xử lý lỗi
  static querySelector<T extends HTMLElement>(selector: string): T | null {
    const element = document.querySelector(selector) as T;
    if (!element) {
      console.warn(`Element with selector "${selector}" not found`);
    }
    return element;
  }

  // Show/hide element
  // Hiện/ẩn element
  static toggleElement(element: HTMLElement | null, show: boolean): void {
    if (!element) return;
    element.style.display = show ? 'block' : 'none';
  }

  // Add/remove CSS class
  // Thêm/xóa CSS class
  static toggleClass(element: HTMLElement | null, className: string, add: boolean): void {
    if (!element) return;
    if (add) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }

  // Set element text content
  // Đặt nội dung text của element
  static setText(element: HTMLElement | null, text: string): void {
    if (!element) return;
    element.textContent = text;
  }

  // Set element HTML content
  // Đặt nội dung HTML của element
  static setHTML(element: HTMLElement | null, html: string): void {
    if (!element) return;
    element.innerHTML = html;
  }
}

// Form utilities
// Tiện ích form
export class FormUtils {
  // Get form data as object
  // Lấy dữ liệu form dưới dạng object
  static getFormData(form: HTMLFormElement): Record<string, any> {
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }

  // Validate email format
  // Kiểm tra định dạng email
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  // Kiểm tra độ mạnh mật khẩu
  static validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }
    
    return { isValid: true, message: 'Password is strong' };
  }

  // Show form error
  // Hiển thị lỗi form
  static showError(elementId: string, message: string): void {
    const errorElement = DOMUtils.getElementById<HTMLElement>(elementId);
    if (errorElement) {
      DOMUtils.setText(errorElement, message);
      DOMUtils.toggleElement(errorElement, true);
    }
  }

  // Hide form error
  // Ẩn lỗi form
  static hideError(elementId: string): void {
    const errorElement = DOMUtils.getElementById<HTMLElement>(elementId);
    if (errorElement) {
      DOMUtils.toggleElement(errorElement, false);
    }
  }

  // Clear form
  // Xóa form
  static clearForm(form: HTMLFormElement): void {
    form.reset();
    // Clear all error messages
    const errorElements = form.querySelectorAll('[id$="-error"]');
    errorElements.forEach(element => {
      DOMUtils.toggleElement(element as HTMLElement, false);
    });
  }
}

// Notification utilities
// Tiện ích thông báo
export class NotificationUtils {
  // Show success notification
  // Hiển thị thông báo thành công
  static showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  // Show error notification
  // Hiển thị thông báo lỗi
  static showError(message: string): void {
    this.showNotification(message, 'error');
  }

  // Show info notification
  // Hiển thị thông báo thông tin
  static showInfo(message: string): void {
    this.showNotification(message, 'info');
  }

  // Show notification
  // Hiển thị thông báo
  private static showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 max-w-sm ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span>${message}</span>
        <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
}

// Post management utilities
// Tiện ích quản lý bài viết
export class PostManager {
  // Load and display posts
  // Tải và hiển thị bài viết
  static async loadPosts(containerId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<void> {
    const container = DOMUtils.getElementById<HTMLElement>(containerId);
    if (!container) return;

    try {
      const response = await postsApi.getPosts(params);
      
      if (response.success && response.data) {
        this.renderPosts(container, response.data.posts);
        this.renderPagination(container, response.data.pagination);
      } else {
        DOMUtils.setHTML(container, '<p class="text-gray-500">Failed to load posts</p>');
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      DOMUtils.setHTML(container, '<p class="text-red-500">Error loading posts</p>');
    }
  }

  // Render posts list
  // Hiển thị danh sách bài viết
  private static renderPosts(container: HTMLElement, posts: Post[]): void {
    if (posts.length === 0) {
      DOMUtils.setHTML(container, '<p class="text-gray-500">No posts found</p>');
      return;
    }

    const postsHTML = posts.map(post => `
      <div class="bg-white p-6 rounded-lg shadow mb-4">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-lg font-semibold text-gray-900">${post.title}</h3>
          <span class="px-2 py-1 text-xs rounded-full ${
            post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
            post.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }">
            ${post.status}
          </span>
        </div>
        <p class="text-gray-600 mb-4">${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}</p>
        <div class="flex justify-between items-center text-sm text-gray-500">
          <span>By ${post.author?.name || 'Unknown'} • ${new Date(post.createdAt).toLocaleDateString()}</span>
          <div class="space-x-2">
            <button onclick="PostManager.viewPost('${post.id}')" class="text-blue-500 hover:text-blue-700">
              View
            </button>
            ${authManager.canManagePosts() ? `
              <button onclick="PostManager.editPost('${post.id}')" class="text-green-500 hover:text-green-700">
                Edit
              </button>
              <button onclick="PostManager.deletePost('${post.id}')" class="text-red-500 hover:text-red-700">
                Delete
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    DOMUtils.setHTML(container, postsHTML);
  }

  // Render pagination
  // Hiển thị phân trang
  private static renderPagination(container: HTMLElement, pagination: any): void {
    const paginationHTML = `
      <div class="flex justify-center items-center space-x-2 mt-6">
        <button 
          onclick="PostManager.loadPosts('${container.id}', { page: ${pagination.page - 1} })"
          ${pagination.page <= 1 ? 'disabled' : ''}
          class="px-3 py-2 rounded-md ${pagination.page <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}"
        >
          Previous
        </button>
        <span class="px-3 py-2 text-gray-700">
          Page ${pagination.page} of ${pagination.pages}
        </span>
        <button 
          onclick="PostManager.loadPosts('${container.id}', { page: ${pagination.page + 1} })"
          ${pagination.page >= pagination.pages ? 'disabled' : ''}
          class="px-3 py-2 rounded-md ${pagination.page >= pagination.pages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}"
        >
          Next
        </button>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', paginationHTML);
  }

  // View post details
  // Xem chi tiết bài viết
  static async viewPost(postId: string): Promise<void> {
    try {
      const response = await postsApi.getPost(postId);
      if (response.success && response.data) {
        const post = response.data.post;
        // Open modal or navigate to post detail page
        alert(`Post: ${post.title}\n\n${post.content}`);
      }
    } catch (error) {
      console.error('Error viewing post:', error);
      NotificationUtils.showError('Failed to load post');
    }
  }

  // Edit post
  // Sửa bài viết
  static editPost(postId: string): void {
    // Navigate to edit page or open edit modal
    console.log('Edit post:', postId);
  }

  // Delete post
  // Xóa bài viết
  static async deletePost(postId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await postsApi.deletePost(postId);
      if (response.success) {
        NotificationUtils.showSuccess('Post deleted successfully');
        // Reload posts
        const container = document.querySelector('[data-posts-container]') as HTMLElement;
        if (container) {
          this.loadPosts(container.id);
        }
      } else {
        NotificationUtils.showError(response.error?.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      NotificationUtils.showError('Failed to delete post');
    }
  }
}

// User management utilities
// Tiện ích quản lý người dùng
export class UserManager {
  // Load and display users
  // Tải và hiển thị người dùng
  static async loadUsers(containerId: string, params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<void> {
    const container = DOMUtils.getElementById<HTMLElement>(containerId);
    if (!container) return;

    try {
      const response = await usersApi.getUsers(params);
      
      if (response.success && response.data) {
        this.renderUsers(container, response.data.users);
        this.renderPagination(container, response.data.pagination);
      } else {
        DOMUtils.setHTML(container, '<p class="text-gray-500">Failed to load users</p>');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      DOMUtils.setHTML(container, '<p class="text-red-500">Error loading users</p>');
    }
  }

  // Render users list
  // Hiển thị danh sách người dùng
  private static renderUsers(container: HTMLElement, users: User[]): void {
    if (users.length === 0) {
      DOMUtils.setHTML(container, '<p class="text-gray-500">No users found</p>');
      return;
    }

    const usersHTML = users.map(user => `
      <div class="bg-white p-6 rounded-lg shadow mb-4">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-lg font-semibold text-gray-900">${user.name || 'No Name'}</h3>
          <span class="px-2 py-1 text-xs rounded-full ${
            user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
            user.role === 'STAFF' ? 'bg-blue-100 text-blue-800' :
            user.role === 'OWNER' ? 'bg-green-100 text-green-800' :
            'bg-purple-100 text-purple-800'
          }">
            ${user.role}
          </span>
        </div>
        <p class="text-gray-600 mb-4">${user.email}</p>
        <div class="flex justify-between items-center text-sm text-gray-500">
          <span>Joined ${new Date(user.createdAt || '').toLocaleDateString()}</span>
          <div class="space-x-2">
            <button onclick="UserManager.editUser('${user.id}')" class="text-blue-500 hover:text-blue-700">
              Edit
            </button>
            <button onclick="UserManager.deleteUser('${user.id}')" class="text-red-500 hover:text-red-700">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');

    DOMUtils.setHTML(container, usersHTML);
  }

  // Render pagination
  // Hiển thị phân trang
  private static renderPagination(container: HTMLElement, pagination: any): void {
    const paginationHTML = `
      <div class="flex justify-center items-center space-x-2 mt-6">
        <button 
          onclick="UserManager.loadUsers('${container.id}', { page: ${pagination.page - 1} })"
          ${pagination.page <= 1 ? 'disabled' : ''}
          class="px-3 py-2 rounded-md ${pagination.page <= 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}"
        >
          Previous
        </button>
        <span class="px-3 py-2 text-gray-700">
          Page ${pagination.page} of ${pagination.pages}
        </span>
        <button 
          onclick="UserManager.loadUsers('${container.id}', { page: ${pagination.page + 1} })"
          ${pagination.page >= pagination.pages ? 'disabled' : ''}
          class="px-3 py-2 rounded-md ${pagination.page >= pagination.pages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}"
        >
          Next
        </button>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', paginationHTML);
  }

  // Edit user
  // Sửa người dùng
  static editUser(userId: string): void {
    // Open edit modal or navigate to edit page
    console.log('Edit user:', userId);
  }

  // Delete user
  // Xóa người dùng
  static async deleteUser(userId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await usersApi.deleteUser(userId);
      if (response.success) {
        NotificationUtils.showSuccess('User deleted successfully');
        // Reload users
        const container = document.querySelector('[data-users-container]') as HTMLElement;
        if (container) {
          this.loadUsers(container.id);
        }
      } else {
        NotificationUtils.showError(response.error?.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      NotificationUtils.showError('Failed to delete user');
    }
  }
}

// Make classes available globally for HTML onclick handlers
// Làm cho các class có thể truy cập toàn cục cho HTML onclick handlers
(window as any).PostManager = PostManager;
(window as any).UserManager = UserManager;
