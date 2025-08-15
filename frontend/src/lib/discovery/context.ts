import type { DiscoveryConfig, DiscoveryGraph, DiscoverySnapshot } from './types';

export interface DiscoveryContext {
  config: DiscoveryConfig | null;
  jobId: string | null;
  graph: DiscoveryGraph;
  snapshots: DiscoverySnapshot[];
  currentLevel: number;
  levelCounts: Record<number, number>;
  error: string | null;
  progress: Record<number, number>; // level -> progress (0-1)
  subAnalysis?: {
    totalItems: number;
    completedItems: number;
    currentItem?: string;
    currentStep?: string;
    currentItemProgress?: number;
    estimatedTimeRemaining?: number;
  };
}

export const initialContext: DiscoveryContext = {
  config: null,
  jobId: null,
  graph: {
    nodes: [],
    edges: [],
  },
  snapshots: [],
  currentLevel: 0,
  levelCounts: {},
  error: null,
  progress: {},
};
