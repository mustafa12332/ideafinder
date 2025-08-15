// Generic analyzer types for different platforms (Reddit, Facebook, Twitter, etc.)

export interface AnalyzerConfig {
  /** Maximum depth of sub-niches to discover */
  maxLevels: number;
  /** Maximum nodes per level */
  maxNodesPerLevel: number;
  /** Platform-specific configuration */
  platformConfig?: Record<string, any>;
}

export interface AnalyzerResult {
  /** Discovered nodes */
  nodes: AnalyzerNode[];
  /** Relationships between nodes */
  edges: AnalyzerEdge[];
  /** Metadata about the analysis */
  metadata: AnalyzerMetadata;
}

export interface AnalyzerNode {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Hierarchy level (0 = root niche) */
  level: number;
  /** Node type */
  type: 'niche' | 'sub-niche' | 'topic';
  /** Platform this node was discovered from */
  source: string;
  /** Additional platform-specific data */
  data?: Record<string, any>;
  /** Confidence score (0-1) */
  confidence: number;
  /** Number of mentions/posts/engagement */
  popularity: number;
}

export interface AnalyzerEdge {
  /** Unique identifier */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Relationship type */
  relationship: 'contains' | 'related-to' | 'derived-from';
  /** Confidence score (0-1) */
  confidence: number;
  /** Platform this relationship was discovered from */
  source_platform: string;
}

export interface AnalyzerMetadata {
  /** Platform name */
  platform: string;
  /** Analysis start time */
  startTime: string;
  /** Analysis end time */
  endTime: string;
  /** Total processing time in ms */
  processingTime: number;
  /** Number of API calls made */
  apiCalls: number;
  /** Rate limit information */
  rateLimitInfo?: {
    remaining: number;
    resetTime: string;
  };
  /** Any errors encountered */
  errors: string[];
  /** Platform-specific metadata */
  platformMetadata?: Record<string, any>;
}

export interface AnalyzerProgress {
  /** Current level being processed */
  currentLevel: number;
  /** Overall progress (0-100) */
  progress: number;
  /** Current status message */
  status: string;
  /** Nodes discovered so far */
  nodesDiscovered: number;
  /** Edges discovered so far */
  edgesDiscovered: number;
  /** Detailed sub-analysis progress */
  subAnalysis?: {
    /** Total number of items to analyze at this level */
    totalItems: number;
    /** Number of items completed */
    completedItems: number;
    /** Current item being analyzed */
    currentItem?: string;
    /** Analysis step (e.g., 'fetching', 'llm_analysis', 'processing') */
    currentStep?: string;
    /** Progress of current item (0-100) */
    currentItemProgress?: number;
    /** Estimated time remaining in seconds */
    estimatedTimeRemaining?: number;
  };
}

export type AnalyzerProgressCallback = (progress: AnalyzerProgress) => void;

/** Base interface for all platform analyzers */
export interface BaseAnalyzer {
  /** Platform name (e.g., 'reddit', 'facebook', 'twitter') */
  readonly platform: string;
  
  /** 
   * Analyze a niche and discover sub-niches
   * @param niche The root niche to analyze
   * @param config Analysis configuration
   * @param progressCallback Optional callback for progress updates
   * @returns Promise resolving to analysis results
   */
  analyze(
    niche: string, 
    config: AnalyzerConfig, 
    progressCallback?: AnalyzerProgressCallback
  ): Promise<AnalyzerResult>;
  
  /**
   * Validate if the analyzer can process the given niche
   * @param niche The niche to validate
   * @returns true if the analyzer can process this niche
   */
  canAnalyze(niche: string): boolean;
  
  /**
   * Get platform-specific configuration schema
   * @returns Configuration options for this platform
   */
  getConfigSchema(): Record<string, any>;
}

/** Combined results from multiple analyzers */
export interface CombinedAnalyzerResult {
  /** All nodes from all analyzers, deduplicated */
  nodes: AnalyzerNode[];
  /** All edges from all analyzers, deduplicated */
  edges: AnalyzerEdge[];
  /** Metadata from each analyzer */
  analyzerMetadata: AnalyzerMetadata[];
  /** Combined analysis metadata */
  combinedMetadata: {
    totalProcessingTime: number;
    totalApiCalls: number;
    platformsUsed: string[];
    startTime: string;
    endTime: string;
  };
}
