import { type ZodSchema } from 'zod';
import { apiErrorSchema } from '@sis/shared';
import { getAccessToken } from '@/lib/auth-session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  schema?: ZodSchema;
}

function buildHeaders(body?: unknown): HeadersInit | undefined {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, schema } = options;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: buildHeaders(body),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    throw new ApiError(
      parsed.success ? parsed.data.error : 'Request failed',
      res.status,
      parsed.success ? parsed.data.details : data,
    );
  }

  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError('Invalid API response', 500, parsed.error.flatten());
    }
    return parsed.data as T;
  }

  return data as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? 'Upload failed', res.status);
  }
  return data as T;
}
