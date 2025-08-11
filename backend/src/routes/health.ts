import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import Constants from '../lib/constants';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeMs: z.number().nonnegative(),
  timestamp: z.string(),
});

export async function healthRoutes(app: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  app.get(Constants.SLASH, {
    schema: {
      response: {
        200: healthResponseSchema,
      },
    },
  }, async () => {
    return {
      status: 'ok',
      uptimeMs: Math.round(process.uptime() * 1000),
      timestamp: new Date().toISOString(),
    } as const;
  });
}


