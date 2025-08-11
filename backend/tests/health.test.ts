import { loadConfig } from '../src/lib/config';
import { buildApp } from '../src/server/app';

describe('health endpoint', () => {
  it('returns ok', async () => {
    const config = loadConfig();
    const app = await buildApp({ ...config, port: 0 });
    const res = await app.inject({ method: 'GET', url: '/health/api/v1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.uptimeMs).toBe('number');
    await app.close();
  });
});


