import { useHealth } from './useHealth';

export function HealthCheck() {
  const { loading, result, error, check } = useHealth();

  return (
    <div className="mt-6 rounded border p-4 bg-white">
      <button
        onClick={check}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Check Backend Health'}
      </button>

      {result && (
        <div className="mt-3 text-sm text-green-700">
          <div>Status: {result.status}</div>
          <div>Uptime: {result.uptimeMs} ms</div>
          <div>Timestamp: {result.timestamp}</div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm text-red-700">Error: {error}</div>
      )}
    </div>
  );
}

export default HealthCheck;


