import { useCallback, useState } from 'react';
import { httpGet } from '../../lib/api/http';

export type HealthResponse = {
  status: 'ok';
  uptimeMs: number;
  timestamp: string;
};

export function useHealth() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await httpGet<HealthResponse>('/health/api/v1');
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, result, error, check } as const;
}


