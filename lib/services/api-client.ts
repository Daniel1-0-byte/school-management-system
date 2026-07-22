/**
 * Centralized API Client
 * Handles all HTTP requests for the school management system
 * Provides consistent error handling, loading states, and response transformation
 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  total?: number;
}

export interface ApiError {
  message: string;
  status: number;
  details?: unknown;
}

export class ApiClient {
  private baseUrl = '/api/school';

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : '');
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
      });

      return this.handleResponse<T>(response);
    } catch (err) {
      return this.handleError(err);
    }
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : '');
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      return this.handleResponse<T>(response);
    } catch (err) {
      return this.handleError(err);
    }
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : '');
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      return this.handleResponse<T>(response);
    } catch (err) {
      return this.handleError(err);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : '');
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        credentials: 'include',
      });

      return this.handleResponse<T>(response);
    } catch (err) {
      return this.handleError(err);
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return data;
  }

  /**
   * Handle request errors
   */
  private handleError(err: unknown): ApiResponse<never> {
    console.error('[v0] API Error:', err);
    return {
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
