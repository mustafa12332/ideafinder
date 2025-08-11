import type { CreateIdeaBodyT, IdeaT } from './schemas';

export interface IdeasRepo {
  list(): Promise<IdeaT[]>;
  create(input: CreateIdeaBodyT): Promise<IdeaT>; 
}

export class InMemoryIdeasRepo implements IdeasRepo {
  private data: IdeaT[] = [];

  async list(): Promise<IdeaT[]> {
    return [...this.data];
  }

  async create(input: CreateIdeaBodyT): Promise<IdeaT> {
    const idea: IdeaT = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.data.push(idea);
    return idea;
  }
}


