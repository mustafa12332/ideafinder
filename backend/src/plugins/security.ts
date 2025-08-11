import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import type { AppConfig } from '../lib/config';

export async function registerSecurityPlugins(app: FastifyInstance, _config: AppConfig): Promise<void> {
  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
}


