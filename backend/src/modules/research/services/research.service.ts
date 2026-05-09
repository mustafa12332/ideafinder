import {
  ResearchResponseSchema,
  type AgentStage,
  type IdeaRecommendation,
  type MarketVerification,
  type ProblemSignal,
  type ResearchEvidence,
  type ResearchRequest,
  type ResearchResponse,
  type SubNiche,
} from '../schemas';

interface ResearchServiceConfig {
  openaiApiKey?: string;
  redditBearerToken?: string;
  redditUserAgent?: string;
  nodeEnv?: string;
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  num_comments: number;
  permalink: string;
  url: string;
}

interface GeneratedSubNiche {
  name: string;
  parent?: string;
  depth: number;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface RedditListingResponse {
  data?: {
    children?: Array<{
      data?: Partial<RedditPost>;
    }>;
  };
}

export interface ResearchService {
  runResearch(request: ResearchRequest): Promise<ResearchResponse>;
}

export class IdeaResearchService implements ResearchService {
  private readonly userAgent: string;
  private readonly allowNetwork: boolean;

  constructor(private readonly config: ResearchServiceConfig) {
    this.userAgent = config.redditUserAgent ?? 'IdeaFinder/1.0.0 (market research agent)';
    this.allowNetwork = config.nodeEnv !== 'test';
  }

  async runResearch(request: ResearchRequest): Promise<ResearchResponse> {
    const stages = this.createStages();

    this.completeStage(stages, 'explorer', `Mapping sub-niches under "${request.niche}".`);
    const subNiches = await this.exploreSubNiches(request);

    this.completeStage(stages, 'sentiment', 'Mining Reddit posts for negative sentiment and repeated pain.');
    const problemSignals = await this.mineProblemSignals(request.niche, subNiches);

    this.completeStage(stages, 'synthesis', 'Converting the strongest pain signal into an app concept.');
    const idea = await this.synthesizeIdea(request.niche, subNiches, problemSignals);

    this.completeStage(stages, 'market', 'Checking similar solutions and estimating demand volume.');
    const market = await this.verifyMarket(idea, problemSignals);

    const response: ResearchResponse = {
      niche: request.niche,
      generatedAt: new Date().toISOString(),
      stages,
      subNiches,
      problemSignals,
      idea,
      market,
      confidenceScore: this.calculateConfidenceScore(problemSignals, market),
    };

    return ResearchResponseSchema.parse(response);
  }

  private createStages(): AgentStage[] {
    return [
      {
        id: 'explorer',
        label: 'Sub-niche explorer',
        status: 'pending',
        summary: 'Waiting to discover related communities and sub-problems.',
      },
      {
        id: 'sentiment',
        label: 'Pain and sentiment miner',
        status: 'pending',
        summary: 'Waiting to score Reddit discussions for frustration and urgency.',
      },
      {
        id: 'synthesis',
        label: 'Solution agent',
        status: 'pending',
        summary: 'Waiting to turn a validated pain pattern into an app idea.',
      },
      {
        id: 'market',
        label: 'Market verifier',
        status: 'pending',
        summary: 'Waiting to estimate demand and identify similar products.',
      },
    ];
  }

  private completeStage(stages: AgentStage[], stageId: string, summary: string): void {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) {
      throw new Error(`Research stage "${stageId}" is not configured.`);
    }

    stage.status = 'complete';
    stage.summary = summary;
  }

  private async exploreSubNiches(request: ResearchRequest): Promise<SubNiche[]> {
    const generatedSubNiches = await this.generateSubNiches(request);
    const redditSubNiches = await this.findRedditSubNiches(request.niche, request.maxBranches);
    const mergedSubNiches = this.mergeSubNiches([...generatedSubNiches, ...redditSubNiches], request.maxBranches);

    return Promise.all(
      mergedSubNiches.map(async (subNiche) => {
        const posts = await this.searchReddit(`${request.niche} ${subNiche.name}`, 12);
        return {
          ...subNiche,
          demandScore: this.calculateDemandScore(posts),
          evidenceCount: posts.length,
        };
      }),
    );
  }

  private async generateSubNiches(request: ResearchRequest): Promise<SubNiche[]> {
    const prompt = `
Return JSON only. Map the niche "${request.niche}" into sub-niches and sub-sub-niches.
Stop when a branch has a specific painful workflow that could become a software product.
Use this shape:
{
  "subNiches": [
    { "name": "specific segment", "parent": "optional parent segment", "depth": 1 }
  ]
}
Generate at most ${request.maxBranches} items per depth and depth ${request.maxDepth}.`;

    const generated = await this.callOpenAI<{ subNiches?: GeneratedSubNiche[] }>(
      'You are a startup research agent that decomposes broad markets into specific buyer segments.',
      prompt,
    );

    const subNiches = generated?.subNiches
      ?.filter((item) => item.name && item.depth >= 1 && item.depth <= request.maxDepth)
      .map((item) => ({
        name: item.name,
        parent: item.parent,
        depth: item.depth,
        demandScore: 0,
        evidenceCount: 0,
      }));

    if (subNiches?.length) {
      return subNiches;
    }

    return this.createFallbackSubNiches(request.niche, request.maxDepth, request.maxBranches);
  }

  private async findRedditSubNiches(niche: string, maxBranches: number): Promise<SubNiche[]> {
    const posts = await this.searchReddit(niche, Math.max(20, maxBranches * 4));
    const subredditCounts = new Map<string, number>();

    posts.forEach((post) => {
      const subreddit = this.formatSubredditName(post.subreddit);
      subredditCounts.set(subreddit, (subredditCounts.get(subreddit) ?? 0) + 1);
    });

    return Array.from(subredditCounts.entries())
      .sort((first, second) => second[1] - first[1])
      .slice(0, maxBranches)
      .map(([name, count]) => ({
        name,
        depth: 1,
        demandScore: Math.min(100, 35 + count * 8),
        evidenceCount: count,
      }));
  }

  private mergeSubNiches(subNiches: SubNiche[], maxBranches: number): SubNiche[] {
    const subNicheByKey = new Map<string, SubNiche>();

    subNiches.forEach((subNiche) => {
      const key = `${subNiche.depth}:${subNiche.name.toLowerCase()}`;
      const existingSubNiche = subNicheByKey.get(key);
      if (!existingSubNiche || existingSubNiche.evidenceCount < subNiche.evidenceCount) {
        subNicheByKey.set(key, subNiche);
      }
    });

    const groupedByDepth = new Map<number, SubNiche[]>();
    Array.from(subNicheByKey.values()).forEach((subNiche) => {
      const items = groupedByDepth.get(subNiche.depth) ?? [];
      items.push(subNiche);
      groupedByDepth.set(subNiche.depth, items);
    });

    return Array.from(groupedByDepth.entries())
      .sort(([firstDepth], [secondDepth]) => firstDepth - secondDepth)
      .flatMap(([, items]) => items.slice(0, maxBranches));
  }

  private createFallbackSubNiches(niche: string, maxDepth: number, maxBranches: number): SubNiche[] {
    const normalizedNiche = niche.trim();
    const depthOne = [
      `${normalizedNiche} beginners`,
      `${normalizedNiche} professionals`,
      `${normalizedNiche} teams`,
      `${normalizedNiche} creators`,
      `${normalizedNiche} operators`,
      `${normalizedNiche} consultants`,
    ];
    const depthTwo = [
      'workflow tracking',
      'decision support',
      'automation setup',
      'reporting pain',
      'collaboration gaps',
      'tool overload',
    ];
    const depthThree = [
      'manual data entry',
      'missed follow ups',
      'poor handoffs',
      'unclear priorities',
      'expensive mistakes',
      'slow onboarding',
    ];

    return [depthOne, depthTwo, depthThree]
      .slice(0, maxDepth)
      .flatMap((names, index) => names.slice(0, maxBranches).map((name) => ({
        name,
        depth: index + 1,
        parent: index === 0 ? undefined : depthOne[0],
        demandScore: 35,
        evidenceCount: 0,
      })));
  }

  private async mineProblemSignals(niche: string, subNiches: SubNiche[]): Promise<ProblemSignal[]> {
    const strongestSubNiches = [...subNiches]
      .sort((first, second) => second.demandScore - first.demandScore)
      .slice(0, 6);

    const signals = await Promise.all(
      strongestSubNiches.map(async (subNiche) => {
        const posts = await this.searchReddit(`${niche} ${subNiche.name} problem OR frustrated OR help`, 18);
        return this.createProblemSignal(niche, subNiche, posts);
      }),
    );

    return signals
      .filter((signal) => signal.evidence.length > 0 || !this.allowNetwork)
      .sort((first, second) => second.intensity - first.intensity)
      .slice(0, 5);
  }

  private createProblemSignal(niche: string, subNiche: SubNiche, posts: RedditPost[]): ProblemSignal {
    const painPosts = posts.filter((post) => this.containsPainLanguage(`${post.title} ${post.selftext}`));
    const evidencePosts = (painPosts.length ? painPosts : posts).slice(0, 4);
    const evidence = evidencePosts.map((post) => this.toResearchEvidence(post));
    const intensity = Math.max(25, Math.min(100, this.calculateDemandScore(evidencePosts) + painPosts.length * 7));

    if (evidence.length === 0) {
      return {
        problem: `${subNiche.name} users waste time stitching together scattered workflows`,
        audience: subNiche.name,
        sentiment: 'mixed',
        intensity,
        evidence: [{
          title: `Fallback signal for ${subNiche.name}`,
          subreddit: 'research fallback',
          url: 'https://www.reddit.com/search/',
          score: 0,
          comments: 0,
          excerpt: `No live Reddit posts were available during tests, so the agent modeled a likely ${niche} workflow pain.`,
        }],
      };
    }

    return {
      problem: this.inferProblemStatement(subNiche, evidencePosts),
      audience: subNiche.name,
      sentiment: painPosts.length >= Math.ceil(posts.length / 3) ? 'negative' : 'mixed',
      intensity,
      evidence,
    };
  }

  private async synthesizeIdea(
    niche: string,
    subNiches: SubNiche[],
    problemSignals: ProblemSignal[],
  ): Promise<IdeaRecommendation> {
    const strongestSignal = problemSignals[0] ?? this.createProblemSignal(niche, subNiches[0], []);
    const prompt = `
Return JSON only. Create one software app idea from this research.
Niche: ${niche}
Strongest problem: ${JSON.stringify(strongestSignal)}
Sub-niches: ${JSON.stringify(subNiches.slice(0, 8))}
Use this exact shape:
{
  "title": "short product name",
  "targetAudience": "specific buyer",
  "painPoint": "specific painful job",
  "solution": "what the app does",
  "keyFeatures": ["feature"],
  "whyNow": "market timing",
  "monetization": "pricing model",
  "mvpScope": ["MVP item"],
  "risks": ["risk"]
}`;

    const idea = await this.callOpenAI<IdeaRecommendation>(
      'You are a pragmatic startup product strategist. Prefer focused B2B or prosumer apps with clear pain.',
      prompt,
    );

    if (idea?.title && idea.keyFeatures?.length) {
      return idea;
    }

    return {
      title: `${this.toTitleCase(strongestSignal.audience)} Copilot`,
      targetAudience: strongestSignal.audience,
      painPoint: strongestSignal.problem,
      solution: `A guided workspace that detects recurring ${niche} issues, organizes the user's context, and recommends the next best action.`,
      keyFeatures: [
        'Reddit-inspired pain tracker',
        'Workflow checklist generator',
        'Automated follow-up reminders',
        'Evidence dashboard for recurring issues',
      ],
      whyNow: `People are already asking for help in ${niche} communities, and AI can now turn scattered discussion context into repeatable workflows.`,
      monetization: 'Free trial with a monthly subscription for saved workflows, team seats, and advanced automations.',
      mvpScope: [
        'Niche onboarding questionnaire',
        'Pain-point library seeded from Reddit evidence',
        'One-click workflow templates',
      ],
      risks: [
        'Reddit demand may not map directly to paid intent',
        'The first version needs a narrow buyer segment to avoid becoming too generic',
      ],
    };
  }

  private async verifyMarket(
    idea: IdeaRecommendation,
    problemSignals: ProblemSignal[],
  ): Promise<MarketVerification> {
    const similarPosts = await this.searchReddit(`"${idea.title}" OR "${idea.painPoint}" app`, 15);
    const monthlyDiscussionEstimate = this.estimateMonthlyDiscussionVolume(problemSignals, similarPosts);
    const validationScore = Math.min(100, Math.round(
      problemSignals.reduce((sum, signal) => sum + signal.intensity, 0) / Math.max(1, problemSignals.length) +
      Math.min(25, similarPosts.length * 2),
    ));

    const prompt = `
Return JSON only. Verify this app idea against the market.
Idea: ${JSON.stringify(idea)}
Reddit problem signals: ${JSON.stringify(problemSignals.slice(0, 4))}
Monthly discussion estimate: ${monthlyDiscussionEstimate}
Use this exact shape:
{
  "similarProducts": ["product or category"],
  "unmetGap": "what is still missing",
  "demandLevel": "low|medium|high",
  "monthlyDiscussionEstimate": 123,
  "validationScore": 75,
  "volumeRationale": "why this estimate is reasonable"
}`;

    const market = await this.callOpenAI<MarketVerification>(
      'You are a market validation agent. Be honest about competition and demand strength.',
      prompt,
    );

    if (market?.similarProducts?.length) {
      return {
        ...market,
        monthlyDiscussionEstimate,
        validationScore: Math.max(0, Math.min(100, market.validationScore)),
      };
    }

    return {
      similarProducts: [
        'Horizontal project management tools',
        'AI note and workflow assistants',
        'Niche-specific templates sold by consultants',
      ],
      unmetGap: 'Existing tools are broad; the opportunity is packaging the workflow around a specific repeated pain with proof from community discussions.',
      demandLevel: monthlyDiscussionEstimate >= 300 ? 'high' : monthlyDiscussionEstimate >= 100 ? 'medium' : 'low',
      monthlyDiscussionEstimate,
      validationScore,
      volumeRationale: `Estimate uses ${problemSignals.length} pain clusters, Reddit engagement, and ${similarPosts.length} similar-solution discussions found by the verifier.`,
    };
  }

  private async searchReddit(query: string, limit: number): Promise<RedditPost[]> {
    if (!this.allowNetwork) {
      return [];
    }

    const searchParams = new URLSearchParams({
      q: query,
      limit: String(Math.min(limit, 100)),
      sort: 'comments',
      t: 'year',
    });
    const baseUrl = this.config.redditBearerToken
      ? 'https://oauth.reddit.com/search'
      : 'https://www.reddit.com/search.json';
    const url = `${baseUrl}?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        headers: this.createRedditHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const listing = await response.json() as RedditListingResponse;
      return listing.data?.children
        ?.map((child) => child.data)
        .filter((post): post is Partial<RedditPost> => Boolean(post?.id && post.title && post.subreddit))
        .map((post) => ({
          id: String(post.id),
          title: String(post.title),
          selftext: String(post.selftext ?? ''),
          subreddit: String(post.subreddit),
          score: Number(post.score ?? 0),
          num_comments: Number(post.num_comments ?? 0),
          permalink: String(post.permalink ?? ''),
          url: String(post.url ?? ''),
        })) ?? [];
    } catch {
      return [];
    }
  }

  private createRedditHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
    };

    if (this.config.redditBearerToken) {
      headers.Authorization = `Bearer ${this.config.redditBearerToken}`;
    }

    return headers;
  }

  private async callOpenAI<TResponse>(systemPrompt: string, userPrompt: string): Promise<TResponse | null> {
    if (!this.config.openaiApiKey || !this.allowNetwork) {
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as OpenAIChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return null;
      }

      return JSON.parse(content) as TResponse;
    } catch {
      return null;
    }
  }

  private containsPainLanguage(text: string): boolean {
    const normalizedText = text.toLowerCase();
    const painTerms = [
      'problem',
      'issue',
      'frustrated',
      'struggling',
      'hard',
      'difficult',
      'annoying',
      'waste',
      'manual',
      'expensive',
      'slow',
      'confusing',
      'help',
      'stuck',
    ];

    return painTerms.some((term) => normalizedText.includes(term));
  }

  private calculateDemandScore(posts: RedditPost[]): number {
    if (posts.length === 0) {
      return 30;
    }

    const totalEngagement = posts.reduce((sum, post) => sum + post.score + post.num_comments * 2, 0);
    const averageEngagement = totalEngagement / posts.length;
    return Math.max(10, Math.min(100, Math.round(posts.length * 4 + averageEngagement / 4)));
  }

  private estimateMonthlyDiscussionVolume(problemSignals: ProblemSignal[], similarPosts: RedditPost[]): number {
    const evidenceVolume = problemSignals.reduce((sum, signal) => {
      const signalEngagement = signal.evidence.reduce((total, item) => total + item.score + item.comments * 2, 0);
      return sum + signalEngagement + signal.intensity;
    }, 0);

    const similarEngagement = similarPosts.reduce((sum, post) => sum + post.score + post.num_comments, 0);
    return Math.max(25, Math.round((evidenceVolume + similarEngagement) / 6));
  }

  private calculateConfidenceScore(problemSignals: ProblemSignal[], market: MarketVerification): number {
    const signalStrength = problemSignals.length
      ? problemSignals.reduce((sum, signal) => sum + signal.intensity, 0) / problemSignals.length
      : 35;
    const demandBoost = market.demandLevel === 'high' ? 15 : market.demandLevel === 'medium' ? 8 : 0;

    return Math.min(100, Math.round(signalStrength * 0.55 + market.validationScore * 0.35 + demandBoost));
  }

  private inferProblemStatement(subNiche: SubNiche, posts: RedditPost[]): string {
    const mostDiscussedPost = [...posts].sort(
      (first, second) => second.num_comments + second.score - (first.num_comments + first.score),
    )[0];

    if (!mostDiscussedPost) {
      return `${subNiche.name} users lack a reliable workflow for recurring tasks.`;
    }

    return `${subNiche.name} users repeatedly discuss: "${this.truncateText(mostDiscussedPost.title, 110)}"`;
  }

  private toResearchEvidence(post: RedditPost): ResearchEvidence {
    return {
      title: post.title,
      subreddit: `r/${post.subreddit}`,
      url: post.permalink ? `https://www.reddit.com${post.permalink}` : post.url,
      score: post.score,
      comments: post.num_comments,
      excerpt: this.truncateText(post.selftext || post.title, 220),
    };
  }

  private formatSubredditName(subreddit: string): string {
    return subreddit
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private toTitleCase(value: string): string {
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 1)}...`;
  }
}
