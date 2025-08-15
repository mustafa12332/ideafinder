import { useMachine } from '@xstate/react';
import { discoveryMachine } from '../lib/discovery/machine';
import type { DiscoveryConfig, DiscoverySnapshot } from '../lib/discovery';

export function useDiscovery() {
  const [state, send] = useMachine(discoveryMachine);
  
  const actions = {
    configure: (config: DiscoveryConfig) => {
      send({ type: 'CONFIGURE', config });
    },
    
    start: () => {
      send({ type: 'START' });
    },
    
    pause: () => {
      send({ type: 'PAUSE' });
    },
    
    resume: () => {
      send({ type: 'RESUME' });
    },
    
    cancel: () => {
      send({ type: 'CANCEL' });
    },
    
    snapshot: () => {
      send({ type: 'SNAPSHOT' });
    },
    
    restoreSnapshot: (snapshot: DiscoverySnapshot) => {
      send({ type: 'RESTORE_SNAPSHOT', snapshot });
    },
  };
  
  const selectors = {
    isIdle: state.matches('idle'),
    isConfigured: state.matches('configured'),
    isStarting: state.matches('starting'),
    isDiscovering: state.matches('discovering'),
    isActive: state.matches({ discovering: 'active' }),
    isPaused: state.matches({ discovering: 'paused' }),
    isComplete: state.matches('complete'),
    isError: state.matches('error'),
    
    canStart: state.matches('configured') && state.context.config !== null,
    canPause: state.matches({ discovering: 'active' }),
    canResume: state.matches({ discovering: 'paused' }),
    canCancel: !state.matches('idle') && !state.matches('configured'),
    canSnapshot: state.context.config !== null,
    
    config: state.context.config,
    jobId: state.context.jobId,
    graph: state.context.graph,
    snapshots: state.context.snapshots,
    currentLevel: state.context.currentLevel,
    levelCounts: state.context.levelCounts,
    error: state.context.error,
    progress: state.context.progress,
    
    // Computed values
    totalNodes: state.context.graph.nodes.length,
    totalEdges: state.context.graph.edges.length,
    hasSnapshots: state.context.snapshots.length > 0,
  };
  
  return {
    state: state.value,
    context: state.context,
    actions,
    ...selectors,
    // Additional context properties for easier access
    subAnalysis: state.context.subAnalysis,
  };
}
