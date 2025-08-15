import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../lib/config';
import { healthRoutes } from './health';
import { ideasRoutes } from '../modules/ideas/routes';
import { discoveryRoutes } from '../modules/discovery/routes';
import { Prefix } from '../lib/constants';

export async function registerRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  await app.register(healthRoutes, { prefix: Prefix.HealthApiV1 });
  await app.register(ideasRoutes, { prefix: Prefix.IdeaApiV1 });
  await app.register(discoveryRoutes, { config }); // Pass config for Reddit API credentials
}


