const API_BASE: string = import.meta.env.VITE_API_URL ?? '/api';

/** Error thrown for non-2xx API responses; carries the server message. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Minimal fetch wrapper: JSON in/out, unwraps the `{ data }` envelope,
 * and converts error bodies into ApiError instances.
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.message ?? `Error de solicitud (${response.status})`);
  }

  return body?.data as T;
}
