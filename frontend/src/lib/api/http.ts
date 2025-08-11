import { API_BASE_URL } from '../../config';

export type HttpError = Error & {
  status?: number;
  cause?: unknown;
};


export async function httpGet<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  const response = await fetch(url, { method: 'GET', ...init });
  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`) as HttpError;
    err.status = response.status;
    try {
      // attempt to include server-provided error body
      (err as any).body = await response.json();
    } catch {}
    throw err;
  }
  return response.json() as Promise<TResponse>;
}


