export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export interface ApiErrorPayload {
  message: string;
  statusCode?: number;
  error?: string;
}

function buildHeaders(token?: string, hasBody = false) {
  const headers = new Headers({ Accept: 'application/json' });

  if (hasBody) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const errorPayload = payload && typeof payload === 'object' ? (payload as ApiErrorPayload) : null;
    throw new Error(errorPayload?.message || 'No se pudo completar la solicitud');
  }

  return payload as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const requestHeaders = buildHeaders(token, Boolean(body));

  if (headers) {
    new Headers(headers).forEach((value, key) => {
      requestHeaders.set(key, value);
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body,
    cache: 'no-store',
  });

  return parseResponse<T>(response);
}
