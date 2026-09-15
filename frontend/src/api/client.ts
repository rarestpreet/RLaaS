const API_BASE = '';

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string>;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('rlaas_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.message) {
        errorMessage = data.message;
      } else if (typeof data === 'string') {
        errorMessage = data;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // ignore fallback
      }
    }

    if (response.status === 401) {
      // Session expired or invalid
      localStorage.removeItem('rlaas_token');
      localStorage.removeItem('rlaas_user');
      window.dispatchEvent(new Event('rlaas_auth_change'));
    }

    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
