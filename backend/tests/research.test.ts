import { describe, expect, it } from '@jest/globals';
import { buildApp } from '../src/server/app';
import type { AppConfig } from '../src/lib/config';

const testConfig: AppConfig = {
  host: '0.0.0.0',
  port: 4000,
  logLevel: 'info',
  nodeEnv: 'test',
};

describe('Research API', () => {
  it('returns a complete idea research report', async () => {
    const app = await buildApp(testConfig);

    const response = await app.inject({
      method: 'POST',
      url: '/api/research',
      payload: {
        niche: 'AI productivity for accountants',
        maxDepth: 2,
        maxBranches: 3,
      },
    });

    expect(response.statusCode).toBe(200);

    const result = JSON.parse(response.body);
    expect(result).toMatchObject({
      niche: 'AI productivity for accountants',
      idea: {
        title: expect.any(String),
        targetAudience: expect.any(String),
        keyFeatures: expect.any(Array),
      },
      market: {
        demandLevel: expect.stringMatching(/low|medium|high/),
        monthlyDiscussionEstimate: expect.any(Number),
        similarProducts: expect.any(Array),
      },
      confidenceScore: expect.any(Number),
    });
    expect(result.stages).toHaveLength(4);
    expect(result.subNiches.length).toBeGreaterThan(0);
    expect(result.problemSignals.length).toBeGreaterThan(0);

    await app.close();
  });

  it('validates research input', async () => {
    const app = await buildApp(testConfig);

    const response = await app.inject({
      method: 'POST',
      url: '/api/research',
      payload: {
        niche: '',
        maxDepth: 10,
        maxBranches: 1,
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
