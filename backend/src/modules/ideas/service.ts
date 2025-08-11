import type { IdeasRepo } from './repo';
import type { CreateIdeaBodyT, IdeaT } from './schemas';

export class IdeasService {
  constructor(private readonly repo: IdeasRepo) {}

  async listIdeas(): Promise<IdeaT[]> {
    return this.repo.list();
  }

  async createIdea(input: CreateIdeaBodyT): Promise<IdeaT> {
    // Example business rule: trim and enforce title casing
    const normalized: CreateIdeaBodyT = {
      title: input.title.trim(),
      description: input.description.trim(),
    };
    return this.repo.create(normalized);
  }
}


