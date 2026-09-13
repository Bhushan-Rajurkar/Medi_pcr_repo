import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!url) {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        url = `http://${hostname}:8080`;
      }
    }
  }

  if (!url) {
    url = 'https://medi-pcr-repo.onrender.com';
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure context-path /api/v1.1 is included
  if (!url.endsWith('/api/v1.1')) {
    url = `${url}/api/v1.1`;
  }

  return url;
};

const DEFAULT_BASE_URL = getBaseUrl();
const TOKEN_KEY = 'medi_pcr_jwt_token';
const USER_KEY = 'medi_pcr_user_data';

class ApiClient {
  private baseUrl: string = DEFAULT_BASE_URL;
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    this.loadToken();
  }

  public setOnUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback;
  }

  private loadToken(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem(TOKEN_KEY);
      } catch (e) {
        // storage disabled or private mode
      }
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && Platform.OS === 'web' && typeof window !== 'undefined') {
      this.loadToken();
    }
    return this.token;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private getHeaders(isMultipart: boolean = false): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      if (response.status === 401 && this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
      }

      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      if (isJson) {
        try {
          const errData = await response.json();
          const candidate = errData.message || errData.error;
          if (candidate) {
            errorMessage = typeof candidate === 'string' ? candidate : JSON.stringify(candidate);
          }
        } catch (e) {
          // ignore parsing error
        }
      } else {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch (e) {
          // ignore
        }
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (isJson) {
      const result = await response.json();
      // Handle Spring ApiResponse wrapper: { success: boolean, message: string, data?: T }
      if (result && typeof result === 'object') {
        if ('success' in result && result.success === false) {
          throw new Error(
            typeof result.message === 'string'
              ? result.message
              : (result.message ? JSON.stringify(result.message) : 'Operation failed')
          );
        }
        if ('data' in result && result.data !== undefined && result.data !== null) {
          return result.data as T;
        }
        if ('message' in result && typeof result.message === 'string') {
          return result.message as unknown as T;
        }
      }
      return result as T;
    }

    return (await response.text()) as unknown as T;
  }

  private async fetchWithFallback(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (err: any) {
      if (err instanceof TypeError || err?.message?.includes('fetch') || err?.name === 'TypeError') {
        let alternateUrl: string | null = null;
        if (url.includes('localhost')) {
          alternateUrl = url.replace('localhost', '127.0.0.1');
        } else if (url.includes('127.0.0.1')) {
          alternateUrl = url.replace('127.0.0.1', 'localhost');
        }

        if (alternateUrl) {
          try {
            const fallbackRes = await fetch(alternateUrl, init);
            // If fallback succeeded, update baseUrl for subsequent calls
            if (this.baseUrl.includes('localhost') && alternateUrl.includes('127.0.0.1')) {
              this.baseUrl = this.baseUrl.replace('localhost', '127.0.0.1');
            }
            return fallbackRes;
          } catch (_) {
            // ignore
          }
        }

        throw new Error(
          `Unable to connect to backend server (${this.baseUrl}). Please verify that your Spring Boot backend is running on port 8080.`
        );
      }
      throw err;
    }
  }

  public async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const response = await this.fetchWithFallback(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  public async post<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const response = await this.fetchWithFallback(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  public async put<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const response = await this.fetchWithFallback(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  public async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const response = await this.fetchWithFallback(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  public async delete<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const response = await this.fetchWithFallback(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  private async sendMultipart<T>(method: 'POST' | 'PUT', path: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

    if (Platform.OS !== 'web') {
      return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.timeout = 120000;

        const token = this.getToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = () => {
          try {
            const isJson = (xhr.getResponseHeader('content-type') || '').includes('application/json');
            let data: any = xhr.responseText;
            if (isJson) {
              try {
                data = JSON.parse(xhr.responseText);
              } catch (_) {}
            }

            if (xhr.status >= 200 && xhr.status < 300) {
              if (data && typeof data === 'object') {
                if ('success' in data && data.success === false) {
                  reject(new Error(data.message || 'Upload operation failed'));
                  return;
                }
                if ('data' in data && data.data !== undefined && data.data !== null) {
                  resolve(data.data as T);
                  return;
                }
                if ('message' in data && typeof data.message === 'string') {
                  resolve(data.message as unknown as T);
                  return;
                }
              }
              resolve(data as T);
            } else {
              if (xhr.status === 401 && this.onUnauthorizedCallback) {
                this.onUnauthorizedCallback();
              }
              const errMsg =
                (data && typeof data === 'object' && (data.message || data.error)) ||
                xhr.responseText ||
                `HTTP Error ${xhr.status}: ${xhr.statusText}`;
              reject(new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)));
            }
          } catch (e: any) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText as unknown as T);
            } else {
              reject(new Error(`HTTP Error ${xhr.status}: ${xhr.responseText}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(
            new Error(
              `Unable to connect to backend server (${this.baseUrl}). Please verify that your backend server is running and reachable.`
            )
          );
        };

        xhr.ontimeout = () => {
          reject(new Error('File upload timed out after 2 minutes. Please check your network connection.'));
        };

        xhr.send(formData);
      });
    }

    const response = await this.fetchWithFallback(url, {
      method,
      headers: this.getHeaders(true),
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  public async postMultipart<T>(path: string, formData: FormData): Promise<T> {
    return this.sendMultipart<T>('POST', path, formData);
  }

  public async putMultipart<T>(path: string, formData: FormData): Promise<T> {
    return this.sendMultipart<T>('PUT', path, formData);
  }
}

export const api = new ApiClient();
export const apiClient = api;
export { TOKEN_KEY, USER_KEY };
