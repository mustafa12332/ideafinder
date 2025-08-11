import type { FastifyInstance } from 'fastify';
import { CreateIdeaBody, Idea, IdeaList } from './schemas';
import Constants from '../../lib/constants';
import { InMemoryIdeasRepo } from './repo';
import { IdeasService } from './service';

export async function ideasRoutes(app: FastifyInstance) {
  const service = new IdeasService(new InMemoryIdeasRepo());

  app.get(Constants.SLASH, {
    schema: {
      response: { 200: IdeaList },
    },
  }, async () => {
    const items = await service.listIdeas();
    return { items } as const;
  });

  app.post(Constants.SLASH, {
    schema: {
      body: CreateIdeaBody,
      response: { 201: Idea },
    },
  }, async (req, reply) => {
    const idea = await service.createIdea(req.body as any);
    reply.code(201).send(idea);
  });
}


