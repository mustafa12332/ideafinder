import type { FastifyInstance } from 'fastify';
import { InMemoryIdeasRepo } from './persistence/ideas.repo';
import { IdeasService } from './services/ideas.service';
import { CreateIdeaBody, Idea, IdeaList } from './services/ideas.validators';

export async function ideasRoutes(app: FastifyInstance) {
  const service = new IdeasService(new InMemoryIdeasRepo());

  app.get('/', { schema: { response: { 200: IdeaList } } }, async () => {
    const items = await service.listIdeas();
    return { items } as const;
  });

  app.post('/', { schema: { body: CreateIdeaBody, response: { 201: Idea } } }, async (req, reply) => {
    const idea = await service.createIdea(req.body as any);
    reply.code(201).send(idea);
  });
}

 