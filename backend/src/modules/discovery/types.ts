export interface DiscoveryConfig {
  niche: string;
  maxLevels: number;
  maxNodesPerLevel: number;
  sources: string[];
}

export interface DiscoveryNode {
  id: string;
  label: string;
  level: number;
  type: 'niche' | 'sub-niche' | 'topic';
  source: string;
  confidence: number;
  popularity: number;
  data?: Record<string, any>;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'contains' | 'related-to' | 'derived-from';
  weight?: number;
}

export interface DiscoveryGraph {
  nodes: DiscoveryNode[];
  edges: DiscoveryEdge[];
}

export interface DiscoveryJob {
  id: string;
  config: DiscoveryConfig;
  status: 'starting' | 'discovering' | 'complete' | 'error' | 'cancelled';
  currentLevel: number;
  totalNodes: number;
  totalEdges: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  subAnalysis?: {
    totalItems: number;
    completedItems: number;
    currentItem?: string;
    currentStep?: string;
    currentItemProgress?: number;
    estimatedTimeRemaining?: number;
  };
}
