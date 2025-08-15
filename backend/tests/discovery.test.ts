import { describe, it, expect } from '@jest/globals';
import { buildApp } from '../src/server/app';
import type { AppConfig } from '../src/lib/config';

const testConfig: AppConfig = {
  host: '0.0.0.0',
  port: 4000,
  logLevel: 'info',
  nodeEnv: 'test',
};

describe('Discovery API', () => {
  it('should start a discovery job', async () => {
    const app = await buildApp(testConfig);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/discover',
      payload: {
        niche: 'AI productivity tools',
        maxLevels: 2,
        maxNodesPerLevel: 5,
        sources: ['reddit', 'twitter'],
      },
    });
    
    expect(response.statusCode).toBe(200);
    
    const result = JSON.parse(response.body);
    expect(result).toMatchObject({
      jobId: expect.any(String),
      status: 'starting',
      message: 'Discovery job started successfully',
    });
    
    await app.close();
  });

  it('should get job status', async () => {
    const app = await buildApp(testConfig);
    
    // First create a job
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/discover',
      payload: {
        niche: 'AI productivity tools',
        maxLevels: 2,
        maxNodesPerLevel: 5,
        sources: ['reddit', 'twitter'],
      },
    });
    
    const { jobId } = JSON.parse(createResponse.body);
    
    // Then get its status
    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/discover/${jobId}`,
    });
    
    expect(statusResponse.statusCode).toBe(200);
    
    const job = JSON.parse(statusResponse.body);
    expect(job).toMatchObject({
      id: jobId,
      status: expect.stringMatching(/starting|discovering|complete/),
      config: {
        niche: 'AI productivity tools',
        maxLevels: 2,
        maxNodesPerLevel: 5,
        sources: ['reddit', 'twitter'],
      },
    });
    
    await app.close();
  });

  it('should return 404 for non-existent job', async () => {
    const app = await buildApp(testConfig);
    
    const response = await app.inject({
      method: 'GET',
      url: '/api/discover/non-existent-job-id',
    });
    
    expect(response.statusCode).toBe(404);
    
    const result = JSON.parse(response.body);
    expect(result).toMatchObject({
      error: 'Not Found',
      message: 'Discovery job not found',
    });
    
    await app.close();
  });

  it('should validate discovery config', async () => {
    const app = await buildApp(testConfig);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/discover',
      payload: {
        niche: '', // Invalid: empty niche
        maxLevels: 0, // Invalid: must be > 0
        maxNodesPerLevel: 5,
        sources: [], // Invalid: empty sources
      },
    });
    
    expect(response.statusCode).toBe(400);
    
    await app.close();
  });
});
