import { z } from 'zod';

export const DiscoveryConfigSchema = z.object({
  niche: z.string().min(1, 'Niche is required'),
  maxLevels: z.number().min(1).max(10),
  maxNodesPerLevel: z.number().min(1).max(100),
  sources: z.array(z.string()).min(1, 'At least one source is required'),
});

export const StartDiscoveryResponseSchema = z.object({
  jobId: z.string(),
  status: z.literal('starting'),
  message: z.string(),
});

export type DiscoveryConfigInput = z.infer<typeof DiscoveryConfigSchema>;
export type StartDiscoveryResponse = z.infer<typeof StartDiscoveryResponseSchema>;
