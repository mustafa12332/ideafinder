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

export interface DiscoverySnapshot {
  id: string;
  timestamp: string;
  config: DiscoveryConfig;
  graph: DiscoveryGraph;
  currentLevel: number;
  levelCounts: Record<number, number>;
}

export interface LevelProgress {
  level: number;
  nodesFound: number;
  edgesFound: number;
  isComplete: boolean;
}
