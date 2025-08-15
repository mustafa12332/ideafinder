import type { IdeasRepo } from '../persistence/ideas.repo';
import type { CreateIdeaInput, Idea } from '../types';

export class IdeasService {
  constructor(private readonly repo: IdeasRepo) {}

  async listIdeas(): Promise<Idea[]> {
    return this.repo.list();
  }

  async createIdea(input: CreateIdeaInput): Promise<Idea> {
    const normalized: CreateIdeaInput = {
      title: input.title.trim(),
      description: input.description.trim(),
    };
    return this.repo.create(normalized);
  }
}


