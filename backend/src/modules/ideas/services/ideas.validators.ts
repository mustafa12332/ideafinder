import { z } from 'zod';

export const CreateIdeaBody = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
});

export const Idea = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
});

export const IdeaList = z.object({
  items: z.array(Idea),
});

export type CreateIdeaBodyT = z.infer<typeof CreateIdeaBody>;


