import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { AppConfig } from './config';

type ErrorResponse = {
  error: string;
  message: string;
  details?: unknown;
};

export function createErrorHandler(_config: AppConfig) {
  // Use a looser 'this' typing to avoid generic incompatibilities
  return function errorHandler(this: any, error: FastifyError, _req: FastifyRequest, reply: FastifyReply) {
    const isZodError = error instanceof ZodError || (error as any)?.name === 'ZodError';
    const statusCode = isZodError ? 400 : (error.statusCode ?? 500);

    const response: ErrorResponse = {
      error: isZodError ? 'ValidationError' : (error.code || 'InternalServerError'),
      message: error.message || 'Unexpected error',
      details: isZodError ? (error as any).issues : undefined,
    };

    if (statusCode >= 500) {
      this.log.error({ err: error }, 'Unhandled error');
    }

    reply.status(statusCode).send(response);
  };
}


