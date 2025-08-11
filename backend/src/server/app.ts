import Fastify from 'fastify';
import fp from 'fastify-plugin';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { registerSecurityPlugins } from '../plugins/security';
import { createLoggerOptions } from '../plugins/logger';
import { registerRoutes } from '../routes';
import { createErrorHandler } from '../lib/errors';
import type { AppConfig } from '../lib/config';

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: createLoggerOptions(config),
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        useDefaults: true,
        coerceTypes: true,
      },
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fp(async (instance) => {
    await registerSecurityPlugins(instance, config);
  }));

  app.setErrorHandler(createErrorHandler(config));

  await registerRoutes(app, config);

  return app;
}


