import type { FastifyServerOptions } from 'fastify';
import type { AppConfig } from '../lib/config';

export function createLoggerOptions(config: AppConfig): FastifyServerOptions['logger'] {
  const isDev = config.nodeEnv === 'development';
  return {
    level: config.logLevel,
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  } as const;
}


