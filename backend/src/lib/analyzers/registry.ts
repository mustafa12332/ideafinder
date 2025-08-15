// Analyzer registry for managing multiple platform analyzers

import type { BaseAnalyzer, AnalyzerConfig, CombinedAnalyzerResult, AnalyzerProgressCallback, AnalyzerResult } from './types';

export class AnalyzerRegistry {
  private analyzers = new Map<string, BaseAnalyzer>();

  /**
   * Register a new analyzer
   * @param analyzer The analyzer to register
   */
  register(analyzer: BaseAnalyzer): void {
    this.analyzers.set(analyzer.platform, analyzer);
  }

  /**
   * Get an analyzer by platform name
   * @param platform Platform name (e.g., 'reddit', 'facebook')
   * @returns The analyzer or undefined if not found
   */
  getAnalyzer(platform: string): BaseAnalyzer | undefined {
    return this.analyzers.get(platform);
  }

  /**
   * Get all registered analyzer platforms
   * @returns Array of platform names
   */
  getAvailablePlatforms(): string[] {
    return Array.from(this.analyzers.keys());
  }

  /**
   * Get analyzers that can process the given niche
   * @param niche The niche to check
   * @returns Array of compatible analyzers
   */
  getCompatibleAnalyzers(niche: string): BaseAnalyzer[] {
    return Array.from(this.analyzers.values()).filter(analyzer => 
      analyzer.canAnalyze(niche)
    );
  }

  /**
   * Analyze a niche using multiple platforms and combine results
   * @param niche The niche to analyze
   * @param platforms Array of platform names to use
   * @param config Analysis configuration
   * @param progressCallback Optional progress callback
   * @returns Combined results from all analyzers
   */
  async analyzeWithMultiplePlatforms(
    niche: string,
    platforms: string[],
    config: AnalyzerConfig,
    progressCallback?: AnalyzerProgressCallback
  ): Promise<CombinedAnalyzerResult> {
    const startTime = new Date().toISOString();
    const analyzerResults: AnalyzerResult[] = [];
    const errors: string[] = [];

    // Get analyzers for requested platforms
    const analyzers = platforms
      .map(platform => this.getAnalyzer(platform))
      .filter((analyzer): analyzer is BaseAnalyzer => analyzer !== undefined);

    if (analyzers.length === 0) {
      throw new Error(`No analyzers found for platforms: ${platforms.join(', ')}`);
    }

    // Run analyzers in parallel
    const analysisPromises = analyzers.map(async (analyzer, index) => {
      try {
        const wrappedProgressCallback = progressCallback ? (progress: any) => {
          // Adjust progress to account for multiple analyzers
          const adjustedProgress = {
            ...progress,
            progress: (progress.progress + (index * 100)) / analyzers.length,
            status: `[${analyzer.platform}] ${progress.status}`,
          };
          progressCallback(adjustedProgress);
        } : undefined;

        const result = await analyzer.analyze(niche, config, wrappedProgressCallback);
        return result;
      } catch (error) {
        const errorMessage = `Error in ${analyzer.platform} analyzer: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        console.error(errorMessage);
        return null;
      }
    });

    const results = await Promise.all(analysisPromises);
    
    // Filter out failed results
    results.forEach(result => {
      if (result) {
        analyzerResults.push(result);
      }
    });

    if (analyzerResults.length === 0) {
      throw new Error(`All analyzers failed. Errors: ${errors.join('; ')}`);
    }

    // Combine results
    return this.combineResults(analyzerResults, startTime);
  }

  /**
   * Combine results from multiple analyzers, handling deduplication
   * @param results Array of analyzer results
   * @param startTime Analysis start time
   * @returns Combined and deduplicated results
   */
  private combineResults(results: AnalyzerResult[], startTime: string): CombinedAnalyzerResult {
    const endTime = new Date().toISOString();
    const allNodes = results.flatMap(r => r.nodes);
    const allEdges = results.flatMap(r => r.edges);
    
    // Deduplicate nodes by label and level (same concept at same level)
    const nodeMap = new Map<string, typeof allNodes[0]>();
    
    allNodes.forEach(node => {
      const key = `${node.label.toLowerCase().trim()}-${node.level}`;
      const existing = nodeMap.get(key);
      
      if (!existing) {
        nodeMap.set(key, node);
      } else {
        // Merge nodes: keep higher confidence, combine popularity, merge sources
        if (node.confidence > existing.confidence) {
          existing.confidence = node.confidence;
          existing.source = node.source; // Use source from higher confidence node
        }
        existing.popularity += node.popularity;
        
        // Merge platform-specific data
        if (node.data && existing.data) {
          existing.data = { ...existing.data, ...node.data };
        }
      }
    });

    // Deduplicate edges by source-target relationship
    const edgeMap = new Map<string, typeof allEdges[0]>();
    
    allEdges.forEach(edge => {
      const key = `${edge.source}-${edge.target}-${edge.relationship}`;
      const existing = edgeMap.get(key);
      
      if (!existing) {
        edgeMap.set(key, edge);
      } else {
        // Keep edge with higher confidence
        if (edge.confidence > existing.confidence) {
          edgeMap.set(key, edge);
        }
      }
    });

    // Update node IDs to be consistent and update edge references
    const deduplicatedNodes = Array.from(nodeMap.values());
    const nodeIdMap = new Map<string, string>();
    
    deduplicatedNodes.forEach((node, index) => {
      const newId = `node-${node.level}-${index}`;
      nodeIdMap.set(node.id, newId);
      node.id = newId;
    });

    // Update edge references to new node IDs
    const deduplicatedEdges = Array.from(edgeMap.values()).map((edge, index) => ({
      ...edge,
      id: `edge-${index}`,
      source: nodeIdMap.get(edge.source) || edge.source,
      target: nodeIdMap.get(edge.target) || edge.target,
    }));

    // Calculate combined metadata
    const totalProcessingTime = results.reduce((sum, r) => sum + r.metadata.processingTime, 0);
    const totalApiCalls = results.reduce((sum, r) => sum + r.metadata.apiCalls, 0);
    const platformsUsed = results.map(r => r.metadata.platform);

    return {
      nodes: deduplicatedNodes,
      edges: deduplicatedEdges,
      analyzerMetadata: results.map(r => r.metadata),
      combinedMetadata: {
        totalProcessingTime,
        totalApiCalls,
        platformsUsed,
        startTime,
        endTime,
      },
    };
  }
}

// Global registry instance
export const analyzerRegistry = new AnalyzerRegistry();
