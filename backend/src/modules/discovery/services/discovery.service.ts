import type { DiscoveryConfig, DiscoveryJob, DiscoveryNode, DiscoveryEdge } from '../types';
import type { DiscoveryRepo } from '../persistence/discovery.repo';
import { analyzerRegistry, RedditAnalyzer, type AnalyzerProgressCallback } from '../../../lib/analyzers';

export interface DiscoveryService {
  startDiscovery(config: DiscoveryConfig): Promise<{ jobId: string; status: string; message: string }>;
  getJobStatus(jobId: string): Promise<DiscoveryJob | null>;
  simulateDiscovery(jobId: string): Promise<void>;
  cancelJob(jobId: string): Promise<{ success: boolean; message: string }>;
}

export class DiscoveryServiceImpl implements DiscoveryService {
  private cancelledJobs = new Set<string>();
  private activeJobs = new Map<string, AbortController>();

  constructor(
    private discoveryRepo: DiscoveryRepo,
    private config?: { 
      redditClientId?: string; 
      redditClientSecret?: string; 
      redditUserAgent?: string;
      openaiApiKey?: string;
    }
  ) {
    // Initialize analyzers
    this.initializeAnalyzers();
  }

  private initializeAnalyzers(): void {
    // Register Reddit analyzer with LLM support
    const redditAnalyzer = new RedditAnalyzer({
      // Use config values if provided, otherwise fallback to environment variables
      clientId: this.config?.redditClientId || process.env.REDDIT_CLIENT_ID,
      clientSecret: this.config?.redditClientSecret || process.env.REDDIT_CLIENT_SECRET,
      userAgent: this.config?.redditUserAgent || process.env.REDDIT_USER_AGENT || 'IdeaFinder/1.0.0 (Sub-niche Discovery Tool)',
      openaiApiKey: this.config?.openaiApiKey || process.env.OPENAI_API_KEY,
      searchLimit: 50, // Reduced for faster LLM processing
      timeFilter: 'month',
      minUpvotes: 3,
      minComments: 1,
    });
    
    analyzerRegistry.register(redditAnalyzer);
  }

  async startDiscovery(config: DiscoveryConfig): Promise<{ jobId: string; status: string; message: string }> {
    const job = await this.discoveryRepo.createJob(config);
    
    // Create abort controller for this job
    const abortController = new AbortController();
    this.activeJobs.set(job.id, abortController);
    
    // Start the real discovery process in the background
    this.runRealDiscovery(job.id, abortController).catch(error => {
      if (error.name === 'AbortError') {
        console.log(`Discovery job ${job.id} was cancelled`);
        this.discoveryRepo.updateJobStatus(job.id, 'cancelled', 'Job was cancelled by user');
      } else {
        console.error(`Discovery job ${job.id} failed:`, error);
        this.discoveryRepo.updateJobStatus(job.id, 'error', error.message);
      }
    }).finally(() => {
      // Cleanup
      this.activeJobs.delete(job.id);
      this.cancelledJobs.delete(job.id);
    });
    
    return {
      jobId: job.id,
      status: 'starting',
      message: 'Discovery job started successfully',
    };
  }

  async getJobStatus(jobId: string): Promise<DiscoveryJob | null> {
    return this.discoveryRepo.getJob(jobId);
  }

  async simulateDiscovery(jobId: string): Promise<void> {
    // Keep for backward compatibility, but delegate to real discovery
    const abortController = new AbortController();
    this.activeJobs.set(jobId, abortController);
    return this.runRealDiscovery(jobId, abortController);
  }

  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const abortController = this.activeJobs.get(jobId);
    
    if (!abortController) {
      return {
        success: false,
        message: 'Job not found or already completed'
      };
    }

    // Mark as cancelled and abort
    this.cancelledJobs.add(jobId);
    abortController.abort();
    
    // Update job status
    await this.discoveryRepo.updateJobStatus(jobId, 'cancelled', 'Job was cancelled by user');
    
    console.log(`Discovery job ${jobId} cancelled successfully`);
    
    return {
      success: true,
      message: 'Job cancelled successfully'
    };
  }

  async runRealDiscovery(jobId: string, _abortController?: AbortController): Promise<void> {
    const job = await this.discoveryRepo.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    try {
      // Update status to discovering
      await this.discoveryRepo.updateJobStatus(jobId, 'discovering');
      
      // Run real discovery using analyzers
      await this.runDiscoveryWithAnalyzers(jobId, job.config);
      
      // Mark as complete
      await this.discoveryRepo.updateJobStatus(jobId, 'complete');
    } catch (error) {
      await this.discoveryRepo.updateJobStatus(jobId, 'error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async runDiscoveryWithAnalyzers(jobId: string, config: DiscoveryConfig): Promise<void> {
    const { niche, sources = ['reddit'] } = config;

    console.log(`[Discovery ${jobId}] Starting real discovery for niche: ${niche}`);
    console.log(`[Discovery ${jobId}] Using platforms: ${sources.join(', ')}`);

    // Create progress callback to log progress and check for cancellation
    const progressCallback: AnalyzerProgressCallback = (progress) => {
      // Check if job was cancelled
      if (this.cancelledJobs.has(jobId)) {
        const error = new Error('Discovery job was cancelled');
        error.name = 'AbortError';
        throw error;
      }
      
      console.log(`[Discovery ${jobId}] ${progress.status} (Level ${progress.currentLevel}, ${progress.progress.toFixed(1)}%)`);
      
      // Update job's current level
      this.discoveryRepo.updateJobCurrentLevel(jobId, progress.currentLevel);
      
      // Update sub-analysis progress if available
      if (progress.subAnalysis) {
        this.discoveryRepo.updateJobSubAnalysis(jobId, progress.subAnalysis);
      }
    };

    try {
      // Use analyzer registry to run discovery with specified platforms
      const result = await analyzerRegistry.analyzeWithMultiplePlatforms(
        niche,
        sources,
        {
          maxLevels: config.maxLevels,
          maxNodesPerLevel: config.maxNodesPerLevel,
          platformConfig: {
            reddit: {
              searchLimit: 50, // Reduce for faster testing
              timeFilter: 'month',
              minUpvotes: 3,
              minComments: 1,
            },
          },
        },
        progressCallback
      );

      console.log(`[Discovery ${jobId}] Analysis complete. Found ${result.nodes.length} nodes and ${result.edges.length} edges`);
      console.log(`[Discovery ${jobId}] Platforms used: ${result.combinedMetadata.platformsUsed.join(', ')}`);
      console.log(`[Discovery ${jobId}] Total processing time: ${result.combinedMetadata.totalProcessingTime}ms`);

      // Convert analyzer results to discovery format and store
      await this.storeAnalyzerResults(jobId, result);

    } catch (error) {
      console.error(`[Discovery ${jobId}] Discovery failed:`, error);
      throw error;
    }
  }

  private async storeAnalyzerResults(jobId: string, result: any): Promise<void> {
    // Convert analyzer nodes to discovery nodes
    for (const analyzerNode of result.nodes) {
      const discoveryNode: DiscoveryNode = {
        id: analyzerNode.id,
        label: analyzerNode.label,
        level: analyzerNode.level,
        type: analyzerNode.type,
        source: analyzerNode.source,
        confidence: analyzerNode.confidence,
        popularity: analyzerNode.popularity,
        data: analyzerNode.data,
        metadata: analyzerNode.metadata || {},
      };
      
      await this.discoveryRepo.addNode(jobId, discoveryNode);
      console.log(`[Discovery ${jobId}] Stored node: ${discoveryNode.label} (Level ${discoveryNode.level}) - Confidence: ${(discoveryNode.confidence * 100).toFixed(1)}%`);
    }

    // Convert analyzer edges to discovery edges
    for (const analyzerEdge of result.edges) {
      const discoveryEdge: DiscoveryEdge = {
        id: analyzerEdge.id,
        source: analyzerEdge.source,
        target: analyzerEdge.target,
        relationship: analyzerEdge.relationship,
      };
      
      await this.discoveryRepo.addEdge(jobId, discoveryEdge);
      console.log(`[Discovery ${jobId}] Stored edge: ${discoveryEdge.source} -> ${discoveryEdge.target}`);
    }
  }
}
