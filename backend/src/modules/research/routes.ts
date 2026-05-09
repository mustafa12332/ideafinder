import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../lib/config';
import { ResearchRequestSchema, ResearchResponseSchema, type ResearchRequest } from './schemas';
import { IdeaResearchService } from './services/research.service';

export async function researchRoutes(app: FastifyInstance, options: { config: AppConfig }) {
  const researchService = new IdeaResearchService({
    openaiApiKey: options.config.openaiApiKey,
    redditBearerToken: options.config.redditBearerToken,
    redditUserAgent: options.config.redditUserAgent,
    nodeEnv: options.config.nodeEnv,
  });

  app.post('/api/research', {
    schema: {
      body: ResearchRequestSchema,
      response: {
        200: ResearchResponseSchema,
      },
    },
  }, async (request, reply) => {
    const researchRequest = request.body as ResearchRequest;

    try {
      const response = await researchService.runResearch(researchRequest);
      return reply.code(200).send(response);
    } catch (error) {
      request.log.error(error, 'Failed to run idea research');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to run idea research',
      });
    }
  });
}
