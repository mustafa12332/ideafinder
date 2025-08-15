// Reddit analyzer for discovering sub-niches from Reddit data

import type { 
  BaseAnalyzer, 
  AnalyzerConfig, 
  AnalyzerResult, 
  AnalyzerNode, 
  AnalyzerEdge, 
  AnalyzerProgressCallback,
  AnalyzerMetadata 
} from '../types';
import { OpenAILLMService, FallbackLLMService, type LLMService } from '../../llm';

interface RedditConfig {
  /** Reddit API credentials */
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
  /** OpenAI API key for LLM-powered analysis */
  openaiApiKey?: string;
  /** Search parameters */
  searchLimit?: number;
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  sortBy?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
  /** Subreddit filtering */
  includeSubreddits?: string[];
  excludeSubreddits?: string[];
  /** Content analysis */
  minUpvotes?: number;
  minComments?: number;
  analyzeComments?: boolean;
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  author: string;
}

// interface RedditComment {
//   id: string;
//   body: string;
//   score: number;
//   author: string;
//   created_utc: number;
// }

interface SubredditInfo {
  name: string;
  display_name: string;
  subscribers: number;
  description: string;
  public_description: string;
}

export class RedditAnalyzer implements BaseAnalyzer {
  readonly platform = 'reddit';
  
  private config: RedditConfig;
  private accessToken?: string;
  private llmService: LLMService;

  constructor(config: RedditConfig = {}) {
    this.config = {
      searchLimit: 100,
      timeFilter: 'month',
      sortBy: 'relevance',
      minUpvotes: 5,
      minComments: 2,
      analyzeComments: true,
      userAgent: 'web:IdeaFinder:v1.0.0 (by /u/ideafinderbot)',
      ...config,
    };

    // Initialize LLM service
    if (config.openaiApiKey) {
      this.llmService = new OpenAILLMService(config.openaiApiKey);
      console.log('✅ Reddit Analyzer: Using OpenAI LLM for intelligent sub-niche extraction');
    } else {
      this.llmService = new FallbackLLMService();
      console.log('⚠️ Reddit Analyzer: Using fallback keyword extraction (consider adding OPENAI_API_KEY for better results)');
    }
  }

  async analyze(
    niche: string, 
    config: AnalyzerConfig, 
    progressCallback?: AnalyzerProgressCallback
  ): Promise<AnalyzerResult> {
    const startTime = new Date().toISOString();
    const metadata: Partial<AnalyzerMetadata> = {
      platform: this.platform,
      startTime,
      apiCalls: 0,
      errors: [],
    };

    try {
      progressCallback?.({
        currentLevel: 0,
        progress: 0,
        status: 'Initializing Reddit analysis...',
        nodesDiscovered: 0,
        edgesDiscovered: 0,
      });

      // Use public API for now (authentication disabled)
      await this.authenticate();

      // Discover nodes level by level
      const allNodes: AnalyzerNode[] = [];
      const allEdges: AnalyzerEdge[] = [];

      // Level 0: Root niche with variable confidence based on niche specificity
      const nicheSpecificity = niche.split(' ').length; // More words = more specific
      const rootConfidence = Math.min(0.95, 0.7 + (nicheSpecificity * 0.05)); // 70% base + 5% per word
      
      const rootNode: AnalyzerNode = {
        id: 'root',
        label: niche,
        level: 0,
        type: 'niche',
        source: this.platform,
        confidence: rootConfidence,
        popularity: 0,
        data: {
          specificity_score: nicheSpecificity,
          reasoning: `Root niche confidence based on specificity (${nicheSpecificity} words)`
        }
      };
      
      console.log(`🎯 Root Niche "${niche}": Specificity=${nicheSpecificity}, Confidence=${rootConfidence.toFixed(2)}`);
      allNodes.push(rootNode);

      progressCallback?.({
        currentLevel: 0,
        progress: 10,
        status: 'Searching Reddit for related content...',
        nodesDiscovered: 1,
        edgesDiscovered: 0,
        subAnalysis: {
          totalItems: 1,
          completedItems: 0,
          currentItem: `"${niche}"`,
          currentStep: 'fetching',
          currentItemProgress: 10
        }
      });

      // Search Reddit for the niche
      const searchResults = await this.searchReddit(niche, config);
      metadata.apiCalls = (metadata.apiCalls || 0) + 1;

      // Level 1: Extract subreddits as sub-niches and analyze with LLM
      const subreddits = await this.extractSubreddits(searchResults, config);
      
      const totalSubreddits = subreddits.length;
      progressCallback?.({
        currentLevel: 1,
        progress: 30,
        status: `Found ${totalSubreddits} subreddits, analyzing...`,
        nodesDiscovered: 1,
        edgesDiscovered: 0,
        subAnalysis: {
          totalItems: totalSubreddits,
          completedItems: 0,
          currentItem: 'Preparing subreddit analysis',
          currentStep: 'processing',
          currentItemProgress: 0
        }
      });
      const level1Nodes = await this.createNodesFromSubredditsWithLLM(subreddits, 1, niche, progressCallback);
      allNodes.push(...level1Nodes);

      // Create edges from root to level 1
      const level1Edges = level1Nodes.map((node) => ({
        id: `edge-root-${node.id}`,
        source: rootNode.id,
        target: node.id,
        relationship: 'contains' as const,
        confidence: 0.8,
        source_platform: this.platform,
      }));
      allEdges.push(...level1Edges);

      progressCallback?.({
        currentLevel: 1,
        progress: 50,
        status: `Found ${level1Nodes.length} subreddits, analyzing deeper levels...`,
        nodesDiscovered: allNodes.length,
        edgesDiscovered: allEdges.length,
      });

      // Level 2+: Analyze posts and comments for topics
      for (let level = 2; level <= config.maxLevels; level++) {
        const parentNodes = allNodes.filter(n => n.level === level - 1);
        const levelNodes: AnalyzerNode[] = [];
        const levelEdges: AnalyzerEdge[] = [];

        // Process ALL parent nodes to ensure complete coverage
        const maxParentsPerLevel = parentNodes.length; // Remove artificial limit
        console.log(`[Level ${level}] Processing ALL ${maxParentsPerLevel} parent nodes`);
        
        // Initial progress for this level
        progressCallback?.({
          currentLevel: level,
          progress: 50 + ((level - 2) / (config.maxLevels - 1)) * 40,
          status: `Level ${level}: Analyzing ${maxParentsPerLevel} parent nodes...`,
          nodesDiscovered: allNodes.length,
          edgesDiscovered: allEdges.length,
          subAnalysis: {
            totalItems: maxParentsPerLevel,
            completedItems: 0,
            currentItem: 'Preparing level analysis',
            currentStep: 'fetching',
            currentItemProgress: 0
          }
        });
        
        for (const [parentIndex, parentNode] of parentNodes.slice(0, maxParentsPerLevel).entries()) {
          try {
            // Get the original subreddit name from node data, or use the label as fallback
            const subredditName = parentNode.data?.original_subreddit || parentNode.label;
            console.log(`[Level ${level}] Analyzing parent "${parentNode.label}" using subreddit "${subredditName}"`);
            
            // Update progress for current parent analysis
            progressCallback?.({
              currentLevel: level,
              progress: 50 + ((level - 2) / (config.maxLevels - 1)) * 40 + ((parentIndex / maxParentsPerLevel) * 10),
              status: `Level ${level}: Analyzing "${parentNode.label}" (${parentIndex + 1}/${maxParentsPerLevel})...`,
              nodesDiscovered: allNodes.length,
              edgesDiscovered: allEdges.length,
              subAnalysis: {
                totalItems: maxParentsPerLevel,
                completedItems: parentIndex,
                currentItem: parentNode.label,
                currentStep: 'llm_analysis',
                currentItemProgress: 25
              }
            });
            
            const topics = await this.extractTopicsFromSubredditWithLLM(subredditName, parentNode.label, niche, config);
            console.log(`[Level ${level}] Found ${topics.length} topics for "${parentNode.label}": ${topics.map(t => t.label).join(', ')}`);
            metadata.apiCalls = (metadata.apiCalls || 0) + 1;

            if (topics.length === 0) {
              console.warn(`[Level ${level}] No topics generated for "${parentNode.label}" - this node will have no children`);
              continue;
            }

          // Allow each parent to generate multiple topics (2-3 per parent)
          const maxTopicsForThisParent = Math.min(topics.length, 3); // Allow up to 3 topics per parent
          
          const topicNodes = topics.slice(0, maxTopicsForThisParent)
            .map((topic, index) => ({
              id: `node-${level}-${parentNode.id}-${index}`,
              label: topic.label,
              level,
              type: 'topic' as const,
              source: this.platform,
              confidence: topic.confidence,
              popularity: topic.popularity || 0,
              data: {
                ...(topic.data || {}),
                reasoning: topic.reasoning,
                original_subreddit: subredditName, // Preserve original subreddit for deeper analysis
                parent_subniche: parentNode.label,
              },
            }));

            levelNodes.push(...topicNodes);

            // Create edges from parent to topics
            const topicEdges = topicNodes.map(node => ({
              id: `edge-${parentNode.id}-${node.id}`,
              source: parentNode.id,
              target: node.id,
              relationship: 'contains' as const,
              confidence: 0.7,
              source_platform: this.platform,
            }));
            levelEdges.push(...topicEdges);
            console.log(`[Level ${level}] Created ${topicNodes.length} nodes and ${topicEdges.length} edges for "${parentNode.label}"`);
            
          } catch (error) {
            console.error(`[Level ${level}] Error processing parent "${parentNode.label}":`, error);
            // Continue with next parent node
          }
        }

        allNodes.push(...levelNodes);
        allEdges.push(...levelEdges);

        progressCallback?.({
          currentLevel: level,
          progress: 50 + ((level - 1) / (config.maxLevels - 1)) * 40,
          status: `Level ${level}: Found ${levelNodes.length} topics`,
          nodesDiscovered: allNodes.length,
          edgesDiscovered: allEdges.length,
        });

        // Break if no more nodes found
        if (levelNodes.length === 0) break;
      }

      progressCallback?.({
        currentLevel: config.maxLevels,
        progress: 100,
        status: 'Reddit analysis complete',
        nodesDiscovered: allNodes.length,
        edgesDiscovered: allEdges.length,
      });

      const endTime = new Date().toISOString();
      const processingTime = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        nodes: allNodes,
        edges: allEdges,
        metadata: {
          platform: this.platform,
          startTime,
          endTime,
          processingTime,
          apiCalls: metadata.apiCalls || 0,
          errors: metadata.errors || [],
          platformMetadata: {
            searchResults: searchResults.length,
            subredditsAnalyzed: subreddits.length,
          },
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      metadata.errors?.push(errorMessage);
      
      progressCallback?.({
        currentLevel: 0,
        progress: 0,
        status: `Error: ${errorMessage}`,
        nodesDiscovered: 0,
        edgesDiscovered: 0,
      });

      throw error;
    }
  }

  canAnalyze(niche: string): boolean {
    // Reddit can analyze most niches, but exclude very sensitive topics
    const excludedKeywords = ['illegal', 'harmful', 'explicit'];
    return !excludedKeywords.some(keyword => 
      niche.toLowerCase().includes(keyword)
    );
  }

  getConfigSchema(): Record<string, any> {
    return {
      clientId: { type: 'string', description: 'Reddit API client ID' },
      clientSecret: { type: 'string', description: 'Reddit API client secret' },
      searchLimit: { type: 'number', default: 100, description: 'Number of posts to analyze per search' },
      timeFilter: { 
        type: 'string', 
        enum: ['hour', 'day', 'week', 'month', 'year', 'all'], 
        default: 'month',
        description: 'Time filter for Reddit search'
      },
      minUpvotes: { type: 'number', default: 5, description: 'Minimum upvotes for content analysis' },
      minComments: { type: 'number', default: 2, description: 'Minimum comments for content analysis' },
    };
  }

  private async authenticate(): Promise<void> {
    // Temporarily disabled for testing
    return;
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    if (!this.config.clientId || !this.config.clientSecret) {
      console.warn('Reddit API credentials not provided, using public API with rate limits');
      return;
    }

    try {
      // Reddit OAuth2 authentication
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': this.config.userAgent!,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Reddit authentication failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      this.accessToken = data.access_token;
    } catch (error) {
      console.warn('Reddit authentication failed, falling back to public API:', error);
    }
  }

  private async searchReddit(niche: string, _config: AnalyzerConfig): Promise<RedditPost[]> {
    const searchQuery = encodeURIComponent(niche);
    const limit = Math.min(this.config.searchLimit || 100, 100); // Reddit API limit
    
    const url = `https://www.reddit.com/search.json?q=${searchQuery}&limit=${limit}&sort=${this.config.sortBy}&t=${this.config.timeFilter}`;
    
    const headers: Record<string, string> = {
      'User-Agent': this.config.userAgent!,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Reddit search failed: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.data.children.map((child: any) => child.data);
  }

  private async extractSubreddits(posts: RedditPost[], config: AnalyzerConfig): Promise<SubredditInfo[]> {
    // Get unique subreddits from posts
    const subredditNames = [...new Set(posts.map(post => post.subreddit))]
      .filter(name => !this.config.excludeSubreddits?.includes(name))
      .slice(0, config.maxNodesPerLevel);

    const subreddits: SubredditInfo[] = [];

    for (const name of subredditNames) {
      try {
        const subredditInfo = await this.getSubredditInfo(name);
        if (subredditInfo && subredditInfo.subscribers >= 1000) { // Filter small subreddits
          subreddits.push(subredditInfo);
        }
      } catch (error) {
        console.warn(`Failed to get info for subreddit ${name}:`, error);
      }
    }

    return subreddits.sort((a, b) => b.subscribers - a.subscribers);
  }

  private async getSubredditInfo(subredditName: string): Promise<SubredditInfo | null> {
    const url = `https://www.reddit.com/r/${subredditName}/about.json`;
    
    const headers: Record<string, string> = {
      'User-Agent': this.config.userAgent!,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json() as any;
      return data.data;
    } catch (error) {
      return null;
    }
  }

  // Removed unused method - now using createNodesFromSubredditsWithLLM

  private async createNodesFromSubredditsWithLLM(
    subreddits: SubredditInfo[], 
    level: number, 
    parentNiche: string,
    progressCallback?: AnalyzerProgressCallback
  ): Promise<AnalyzerNode[]> {
    const nodes: AnalyzerNode[] = [];
    const totalSubreddits = subreddits.length;

    for (const [index, subreddit] of subreddits.entries()) {
      // Update progress for current subreddit
      progressCallback?.({
        currentLevel: level,
        progress: 30 + ((index / totalSubreddits) * 20), // 30-50% range for Level 1
        status: `Analyzing subreddit ${index + 1}/${totalSubreddits}...`,
        nodesDiscovered: nodes.length + 1, // +1 for root
        edgesDiscovered: nodes.length,
        subAnalysis: {
          totalItems: totalSubreddits,
          completedItems: index,
          currentItem: `r/${subreddit.display_name}`,
          currentStep: 'llm_analysis',
          currentItemProgress: 0
        }
      });
      try {
        // Use LLM to extract intelligent sub-niches from subreddit
        const subNiches = await this.llmService.extractSubNichesFromSubreddit(
          subreddit.display_name,
          subreddit.description || subreddit.public_description || '',
          parentNiche,
          2 // Extract up to 2 sub-niches per subreddit
        );

        console.log(`🔍 Subreddit r/${subreddit.display_name}: LLM returned ${subNiches.length} sub-niches`);
        
        // Update progress after LLM analysis
        progressCallback?.({
          currentLevel: level,
          progress: 30 + ((index / totalSubreddits) * 20) + (10 / totalSubreddits), // Add completion progress
          status: `Processing r/${subreddit.display_name}...`,
          nodesDiscovered: nodes.length + 1,
          edgesDiscovered: nodes.length,
          subAnalysis: {
            totalItems: totalSubreddits,
            completedItems: index,
            currentItem: `r/${subreddit.display_name}`,
            currentStep: 'processing',
            currentItemProgress: 75
          }
        });
        
        if (subNiches.length > 0) {
          // Use the best sub-niche from LLM analysis with enhanced confidence
          const bestSubNiche = subNiches[0];
          console.log(`✅ Using LLM result for r/${subreddit.display_name}: "${bestSubNiche.label}"`);
          
          // Calculate enhanced confidence based on subreddit metrics with more variation
          const baseConfidence = typeof bestSubNiche.confidence === 'number' && !isNaN(bestSubNiche.confidence) ? bestSubNiche.confidence : (0.4 + Math.random() * 0.4); // 40-80% default range
          const subscriberFactor = Math.min(0.8, Math.max(0, Math.log10(Math.max(1, subreddit.subscribers)) / 7)); // Normalize subscribers (reduced impact)
          const activityFactor = subreddit.description ? (0.05 + Math.random() * 0.1) : 0; // Variable activity bonus
          
          // More significant variation based on subreddit characteristics
          const variationSeed = subreddit.display_name.length + subreddit.subscribers;
          const pseudoRandom = (variationSeed * 9301 + 49297) % 233280 / 233280; // Deterministic but varied
          const randomVariation = (pseudoRandom - 0.5) * 0.2; // ±10% variation
          
          const enhancedConfidence = Math.max(0.25, Math.min(0.88, 
            baseConfidence * 0.6 + // LLM confidence (60%)
            subscriberFactor * 0.25 + // Subscriber count (25%)
            activityFactor + // Description bonus (5-15%)
            randomVariation // Variation (±10%)
          ));
          
          console.log(`🎯 SubNiche "${bestSubNiche.label}": LLM=${baseConfidence.toFixed(2)}, Subscribers=${subscriberFactor.toFixed(2)}, Enhanced=${enhancedConfidence.toFixed(2)}`);
          
          nodes.push({
            id: `node-${level}-${index}`,
            label: bestSubNiche.label,
            level,
            type: level === 1 ? 'sub-niche' : 'topic',
            source: this.platform,
            confidence: enhancedConfidence,
            popularity: subreddit.subscribers,
            data: {
              description: subreddit.description,
              public_description: subreddit.public_description,
              subscribers: subreddit.subscribers,
              subreddit_url: `https://www.reddit.com/r/${subreddit.name}`,
              llm_reasoning: bestSubNiche.reasoning,
              original_subreddit: subreddit.display_name,
              llm_confidence: baseConfidence,
              enhanced_confidence: enhancedConfidence,
              subscriber_factor: subscriberFactor,
            },
          });
        } else {
          // Fallback to original subreddit name
          console.log(`⚠️ Using fallback for r/${subreddit.display_name} (no LLM sub-niches)`);
          
          // Create varied fallback confidence based on subreddit characteristics
          const subscriberScore = Math.log10(Math.max(1, subreddit.subscribers)) / 7; // 0-1 range
          const nameVariation = (subreddit.display_name.length * 13 + 7) % 100 / 100; // Deterministic variation
          const fallbackConfidence = Math.max(0.25, Math.min(0.75, 
            0.4 + // Base 40%
            subscriberScore * 0.2 + // Up to 20% from subscribers
            nameVariation * 0.15 // Up to 15% from name characteristics
          ));
          console.log(`🎯 Fallback confidence for r/${subreddit.display_name}: ${fallbackConfidence.toFixed(2)} (${subreddit.subscribers} subscribers, variation=${nameVariation.toFixed(2)})`);
          
          nodes.push({
            id: `node-${level}-${index}`,
            label: subreddit.display_name,
            level,
            type: level === 1 ? 'sub-niche' : 'topic',
            source: this.platform,
            confidence: fallbackConfidence,
            popularity: subreddit.subscribers,
            data: {
              description: subreddit.description,
              public_description: subreddit.public_description,
              subscribers: subreddit.subscribers,
              subreddit_url: `https://www.reddit.com/r/${subreddit.name}`,
            },
          });
        }
      } catch (error) {
        console.warn(`LLM analysis failed for r/${subreddit.display_name}, using fallback:`, error);
        // Fallback to original method
        nodes.push({
          id: `node-${level}-${index}`,
          label: subreddit.display_name,
          level,
          type: level === 1 ? 'sub-niche' : 'topic',
          source: this.platform,
          confidence: Math.min(0.6, Math.log10(subreddit.subscribers) / 6),
          popularity: subreddit.subscribers,
          data: {
            description: subreddit.description,
            public_description: subreddit.public_description,
            subscribers: subreddit.subscribers,
            subreddit_url: `https://www.reddit.com/r/${subreddit.name}`,
          },
        });
      }
    }

    return nodes;
  }

  private async extractTopicsFromSubredditWithLLM(
    subredditName: string, 
    parentNiche: string, 
    originalNiche: string,
    _config: AnalyzerConfig
  ): Promise<Array<{
    label: string;
    confidence: number;
    popularity?: number;
    reasoning: string;
    data?: Record<string, any>;
  }>> {
    try {
      // Get hot posts from the subreddit
      const url = `https://www.reddit.com/r/${subredditName}/hot.json?limit=15`;
      
      const headers: Record<string, string> = {
        'User-Agent': this.config.userAgent!,
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any;
      const posts: RedditPost[] = data.data.children.map((child: any) => child.data);

      // Filter posts by engagement
      const qualityPosts = posts.filter(post => 
        post.score >= (this.config.minUpvotes || 3) &&
        post.num_comments >= (this.config.minComments || 1)
      );

      if (qualityPosts.length === 0) {
        console.log(`[Level Analysis] No quality posts found for r/${subredditName}, generating fallback topics`);
        // Generate fallback topics based on subreddit name and parent niche
        return await this.generateFallbackTopics(subredditName, parentNiche);
      }

      // Format posts for LLM analysis
      const formattedPosts = qualityPosts.map(post => ({
        title: post.title,
        content: post.selftext || '',
        score: post.score,
      }));

      // Use LLM to extract intelligent topics with original niche context
      const topics = await this.llmService.extractTopicsFromPosts(
        formattedPosts,
        `${parentNiche} - ${subredditName}`,
        originalNiche, // Pass the original niche for context
        3 // Extract up to 3 topics
      );

      return topics.map(topic => {
        // Calculate enhanced confidence based on multiple factors
        const avgScore = qualityPosts.length > 0 ? qualityPosts.reduce((sum, post) => sum + post.score, 0) / qualityPosts.length : 0;
        const totalComments = qualityPosts.reduce((sum, post) => sum + post.num_comments, 0);
        
        // Confidence factors with safe fallbacks:
        const baseConfidence = typeof topic.confidence === 'number' && !isNaN(topic.confidence) ? topic.confidence : 0.5; // Default to 50% if invalid
        const engagementFactor = Math.min(1.0, Math.max(0, avgScore / 50)); // Normalize avg score to 0-1
        const volumeFactor = Math.min(1.0, qualityPosts.length / 10); // More posts = higher confidence
        const commentsFactor = Math.min(1.0, totalComments / 100); // More comments = higher confidence
        
        // Add small variation to prevent identical confidence values
        const randomVariation = (Math.random() - 0.5) * 0.08; // ±4% variation
        
        // Weighted confidence calculation with validation
        const enhancedConfidence = Math.max(0.1, Math.min(0.95,
          baseConfidence * 0.5 + // LLM confidence (50%)
          engagementFactor * 0.2 + // Post scores (20%)
          volumeFactor * 0.2 + // Number of posts (20%)
          commentsFactor * 0.1 + // Comments (10%)
          randomVariation // Small variation to ensure uniqueness
        ));
        
        // Debug logging for NaN issues
        if (isNaN(enhancedConfidence)) {
          console.error(`NaN confidence detected for topic "${topic.label}":`, {
            baseConfidence,
            engagementFactor,
            volumeFactor,
            commentsFactor,
            avgScore,
            totalComments,
            postsLength: qualityPosts.length
          });
        }

        const finalConfidence = isNaN(enhancedConfidence) ? 0.5 : Math.min(0.95, enhancedConfidence);
        console.log(`🎯 Topic "${topic.label}": LLM=${baseConfidence.toFixed(2)}, Enhanced=${enhancedConfidence.toFixed(2)}, Final=${finalConfidence.toFixed(2)}`);
        
        return {
          label: topic.label,
          confidence: finalConfidence,
          popularity: avgScore,
          reasoning: `${topic.reasoning} (Enhanced: ${qualityPosts.length} posts, avg ${avgScore.toFixed(1)} score)`,
          data: {
            subreddit: subredditName,
            posts_analyzed: qualityPosts.length,
            avg_score: avgScore,
            total_comments: totalComments,
            llm_confidence: baseConfidence,
            enhanced_confidence: enhancedConfidence,
            llm_analysis: true,
          },
        };
      });
      
    } catch (error) {
      console.warn(`LLM topic extraction failed for r/${subredditName}:`, error);
      // Fallback to original method
      const fallbackTopics = await this.extractTopicsFromSubreddit(subredditName, _config);
      return fallbackTopics.map(topic => ({
        ...topic,
        reasoning: 'Fallback keyword extraction due to LLM failure',
      }));
    }
  }

  private async generateFallbackTopics(
    subredditName: string, 
    parentNiche: string
  ): Promise<Array<{
    label: string;
    confidence: number;
    popularity?: number;
    reasoning: string;
    data?: Record<string, any>;
  }>> {
    // Try to use LLM to generate topics based on subreddit name and parent niche
    if (this.llmService.isAvailable()) {
      try {
        const topics = await this.llmService.extractSubNichesFromSubreddit(
          subredditName,
          `Subreddit focused on ${subredditName.replace(/[_-]/g, ' ')} within ${parentNiche}`,
          parentNiche,
          2
        );
        
        return topics.map((topic, index) => ({
          label: topic.label,
          confidence: Math.max(0.3, (topic.confidence - 0.2) * (1 - index * 0.1)), // Decreasing confidence for fallback
          popularity: 0,
          reasoning: `Generated from subreddit context (no posts available): ${topic.reasoning}`,
          data: {
            subreddit: subredditName,
            fallback_generation: true,
            fallback_type: 'llm_context',
          },
        }));
      } catch (error) {
        console.warn(`Fallback LLM generation failed for r/${subredditName}:`, error);
      }
    }

    // Final fallback: generate simple topics based on subreddit name
    const cleanName = subredditName.replace(/[_-]/g, ' ').toLowerCase();
    const baseTopics = [
      `${cleanName} tools`,
      `${cleanName} strategies`,
      `${cleanName} community`,
    ];

    return baseTopics.map((topic, index) => ({
      label: topic.charAt(0).toUpperCase() + topic.slice(1),
      confidence: Math.max(0.15, 0.35 - index * 0.08), // More realistic decreasing confidence
      popularity: 0,
      reasoning: `Generated from subreddit name as no posts were available for analysis (fallback)`,
      data: {
        subreddit: subredditName,
        simple_fallback: true,
        fallback_type: 'simple_naming',
      },
    }));
  }

  private async extractTopicsFromSubreddit(subredditName: string, _config: AnalyzerConfig): Promise<Array<{
    label: string;
    confidence: number;
    popularity: number;
    data?: Record<string, any>;
  }>> {
    try {
      // Get hot posts from the subreddit
      const url = `https://www.reddit.com/r/${subredditName}/hot.json?limit=25`;
      
      const headers: Record<string, string> = {
        'User-Agent': this.config.userAgent!,
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any;
      const posts: RedditPost[] = data.data.children.map((child: any) => child.data);

      // Filter posts by engagement
      const qualityPosts = posts.filter(post => 
        post.score >= (this.config.minUpvotes || 5) &&
        post.num_comments >= (this.config.minComments || 2)
      );

      // Extract topics from post titles using simple keyword extraction
      const topics = this.extractTopicsFromTitles(qualityPosts);
      
      return topics.slice(0, 5); // Limit topics per subreddit
      
    } catch (error) {
      console.warn(`Failed to extract topics from r/${subredditName}:`, error);
      return [];
    }
  }

  private extractTopicsFromTitles(posts: RedditPost[]): Array<{
    label: string;
    confidence: number;
    popularity: number;
    data?: Record<string, any>;
  }> {
    // Simple topic extraction from titles
    // In a real implementation, you'd use NLP libraries like natural, compromise, or call an AI API
    
    const topicCounts = new Map<string, { count: number; totalScore: number; posts: RedditPost[] }>();
    
    posts.forEach(post => {
      // Extract potential topics (simplified - look for capitalized words, common phrases)
      const title = post.title.toLowerCase();
      const words = title.split(/\s+/).filter(word => word.length > 3);
      
      // Look for common topic indicators
      const topicIndicators = [
        'how to',
        'best',
        'guide',
        'tutorial',
        'tips',
        'advice',
        'help',
        'question',
        'discussion',
        'review',
        'comparison',
        'vs',
        'versus',
      ];

      topicIndicators.forEach(indicator => {
        if (title.includes(indicator)) {
          const existing = topicCounts.get(indicator) || { count: 0, totalScore: 0, posts: [] };
          existing.count++;
          existing.totalScore += post.score;
          existing.posts.push(post);
          topicCounts.set(indicator, existing);
        }
      });

      // Also look for frequently mentioned words (basic keyword extraction)
      words.forEach(word => {
        if (word.length > 4 && !['with', 'from', 'that', 'this', 'have', 'will', 'been', 'were'].includes(word)) {
          const existing = topicCounts.get(word) || { count: 0, totalScore: 0, posts: [] };
          existing.count++;
          existing.totalScore += post.score;
          existing.posts.push(post);
          topicCounts.set(word, existing);
        }
      });
    });

    // Convert to topics, filtering by frequency
    return Array.from(topicCounts.entries())
      .filter(([_, data]) => data.count >= 2) // Must appear at least twice
      .sort((a, b) => b[1].totalScore - a[1].totalScore) // Sort by total engagement
      .map(([topic, data]) => ({
        label: topic.charAt(0).toUpperCase() + topic.slice(1), // Capitalize
        confidence: Math.min(0.8, data.count / posts.length), // Confidence based on frequency
        popularity: data.totalScore,
        data: {
          mentionCount: data.count,
          averageScore: data.totalScore / data.count,
          samplePosts: data.posts.slice(0, 3).map(p => ({
            title: p.title,
            score: p.score,
            url: `https://www.reddit.com${p.url}`,
          })),
        },
      }));
  }
}
