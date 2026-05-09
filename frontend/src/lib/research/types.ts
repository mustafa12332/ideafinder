export interface ResearchRequest {
  niche: string;
  maxDepth: number;
  maxBranches: number;
}

export interface AgentStage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  summary: string;
}

export interface ResearchEvidence {
  title: string;
  subreddit: string;
  url: string;
  score: number;
  comments: number;
  excerpt: string;
}

export interface SubNiche {
  name: string;
  depth: number;
  parent?: string;
  demandScore: number;
  evidenceCount: number;
}

export interface ProblemSignal {
  problem: string;
  audience: string;
  sentiment: 'negative' | 'mixed' | 'positive';
  intensity: number;
  evidence: ResearchEvidence[];
}

export interface IdeaRecommendation {
  title: string;
  targetAudience: string;
  painPoint: string;
  solution: string;
  keyFeatures: string[];
  whyNow: string;
  monetization: string;
  mvpScope: string[];
  risks: string[];
}

export interface MarketVerification {
  similarProducts: string[];
  unmetGap: string;
  demandLevel: 'low' | 'medium' | 'high';
  monthlyDiscussionEstimate: number;
  validationScore: number;
  volumeRationale: string;
}

export interface ResearchResponse {
  niche: string;
  generatedAt: string;
  stages: AgentStage[];
  subNiches: SubNiche[];
  problemSignals: ProblemSignal[];
  idea: IdeaRecommendation;
  market: MarketVerification;
  confidenceScore: number;
}
