import type { CreateIdeaInput, Idea } from '../types';

export interface IdeasRepo {
  list(): Promise<Idea[]>;
  create(input: CreateIdeaInput): Promise<Idea>;
}

export class InMemoryIdeasRepo implements IdeasRepo {
  private data: Idea[] = [];

  async list(): Promise<Idea[]> {
    return [...this.data];
  }

  async create(input: CreateIdeaInput): Promise<Idea> {
    const idea: Idea = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.data.push(idea);
    return idea;
  }
}


