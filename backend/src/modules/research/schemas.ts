import { z } from 'zod';

export const ResearchRequestSchema = z.object({
  niche: z.string().min(2, 'Niche is required').max(160),
  maxDepth: z.number().int().min(1).max(4).default(3),
  maxBranches: z.number().int().min(2).max(12).default(6),
});

export const AgentStageSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['pending', 'running', 'complete', 'error']),
  summary: z.string(),
});

export const ResearchEvidenceSchema = z.object({
  title: z.string(),
  subreddit: z.string(),
  url: z.string(),
  score: z.number(),
  comments: z.number(),
  excerpt: z.string(),
});

export const SubNicheSchema = z.object({
  name: z.string(),
  depth: z.number(),
  parent: z.string().optional(),
  demandScore: z.number().min(0).max(100),
  evidenceCount: z.number().int().min(0),
});

export const ProblemSignalSchema = z.object({
  problem: z.string(),
  audience: z.string(),
  sentiment: z.enum(['negative', 'mixed', 'positive']),
  intensity: z.number().min(0).max(100),
  evidence: z.array(ResearchEvidenceSchema),
});

export const IdeaRecommendationSchema = z.object({
  title: z.string(),
  targetAudience: z.string(),
  painPoint: z.string(),
  solution: z.string(),
  keyFeatures: z.array(z.string()),
  whyNow: z.string(),
  monetization: z.string(),
  mvpScope: z.array(z.string()),
  risks: z.array(z.string()),
});

export const MarketVerificationSchema = z.object({
  similarProducts: z.array(z.string()),
  unmetGap: z.string(),
  demandLevel: z.enum(['low', 'medium', 'high']),
  monthlyDiscussionEstimate: z.number().int().min(0),
  validationScore: z.number().min(0).max(100),
  volumeRationale: z.string(),
});

export const ResearchResponseSchema = z.object({
  niche: z.string(),
  generatedAt: z.string(),
  stages: z.array(AgentStageSchema),
  subNiches: z.array(SubNicheSchema),
  problemSignals: z.array(ProblemSignalSchema),
  idea: IdeaRecommendationSchema,
  market: MarketVerificationSchema,
  confidenceScore: z.number().min(0).max(100),
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
export type AgentStage = z.infer<typeof AgentStageSchema>;
export type ResearchEvidence = z.infer<typeof ResearchEvidenceSchema>;
export type SubNiche = z.infer<typeof SubNicheSchema>;
export type ProblemSignal = z.infer<typeof ProblemSignalSchema>;
export type IdeaRecommendation = z.infer<typeof IdeaRecommendationSchema>;
export type MarketVerification = z.infer<typeof MarketVerificationSchema>;
export type ResearchResponse = z.infer<typeof ResearchResponseSchema>;
