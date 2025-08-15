import type { DiscoveryConfig, DiscoverySnapshot, DiscoveryNode, DiscoveryEdge } from './types';

// User-initiated events
export type ConfigureEvent = {
  type: 'CONFIGURE';
  config: DiscoveryConfig;
};

export type StartEvent = {
  type: 'START';
};

export type PauseEvent = {
  type: 'PAUSE';
};

export type ResumeEvent = {
  type: 'RESUME';
};

export type CancelEvent = {
  type: 'CANCEL';
};

export type SnapshotEvent = {
  type: 'SNAPSHOT';
};

export type RestoreSnapshotEvent = {
  type: 'RESTORE_SNAPSHOT';
  snapshot: DiscoverySnapshot;
};

// SSE/Backend events
export type LevelStartedEvent = {
  type: 'LEVEL_STARTED';
  level: number;
};

export type NodeFoundEvent = {
  type: 'NODE_FOUND';
  node: DiscoveryNode;
};

export type EdgeFoundEvent = {
  type: 'EDGE_FOUND';
  edge: DiscoveryEdge;
};

export type LevelCompletedEvent = {
  type: 'LEVEL_COMPLETED';
  level: number;
  nodeCount: number;
  edgeCount: number;
};

export type ProgressEvent = {
  type: 'PROGRESS';
  level: number;
  progress: number; // 0-1
};

export type DoneEvent = {
  type: 'DONE';
  totalNodes: number;
  totalEdges: number;
  completedLevels: number;
};

export type ErrorEvent = {
  type: 'ERROR';
  message: string;
  code?: string;
};

// Internal events
export type JobStartedEvent = {
  type: 'JOB_STARTED';
  jobId: string;
};

export type StreamConnectedEvent = {
  type: 'STREAM_CONNECTED';
};

export type StreamDisconnectedEvent = {
  type: 'STREAM_DISCONNECTED';
  reason?: string;
};

export type DiscoveryEvent =
  | ConfigureEvent
  | StartEvent
  | PauseEvent
  | ResumeEvent
  | CancelEvent
  | SnapshotEvent
  | RestoreSnapshotEvent
  | LevelStartedEvent
  | NodeFoundEvent
  | EdgeFoundEvent
  | LevelCompletedEvent
  | ProgressEvent
  | DoneEvent
  | ErrorEvent
  | JobStartedEvent
  | StreamConnectedEvent
  | StreamDisconnectedEvent;
