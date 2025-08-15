import { createMachine, assign } from 'xstate';
import type { DiscoveryContext } from './context';
import { initialContext } from './context';
import type { DiscoveryEvent } from './events';
import { API_BASE_URL } from '../../config';

// Services
const startJobService = (context: DiscoveryContext) => {
  const url = API_BASE_URL ? `${API_BASE_URL}/api/discover` : '/api/discover';
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(context.config),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to start discovery job: ${response.status}`);
    }
    return response.json();
  })
  .then(data => ({ jobId: data.jobId }));
};

const cancelJobService = (context: DiscoveryContext) => {
  if (!context.jobId) {
    return Promise.resolve({ success: false, message: 'No job to cancel' });
  }

  const url = API_BASE_URL 
    ? `${API_BASE_URL}/api/discover/${context.jobId}` 
    : `/api/discover/${context.jobId}`;
  
  return fetch(url, {
    method: 'DELETE',
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to cancel discovery job: ${response.status}`);
    }
    return response.json();
  })
  .then(data => ({ success: data.success, message: data.message }));
};

const sseStreamService = (context: DiscoveryContext) => (callback: any) => {
  const url = API_BASE_URL 
    ? `${API_BASE_URL}/api/discover/${context.jobId}/stream`
    : `/api/discover/${context.jobId}/stream`;
  
  const eventSource = new EventSource(url);
  
  eventSource.onopen = () => {
    callback({ type: 'STREAM_CONNECTED' });
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
    callback({ type: 'STREAM_DISCONNECTED', reason: 'Connection error' });
  };
  
  // Handle different event types from the SSE stream
  eventSource.addEventListener('level_started', (event: any) => {
    const data = JSON.parse(event.data);
    callback({ type: 'LEVEL_STARTED', level: data.level });
  });
  
  eventSource.addEventListener('node_found', (event: any) => {
    const data = JSON.parse(event.data);
    callback({ type: 'NODE_FOUND', node: data.node });
  });
  
  eventSource.addEventListener('edge_found', (event: any) => {
    const data = JSON.parse(event.data);
    callback({ type: 'EDGE_FOUND', edge: data.edge });
  });
  
  eventSource.addEventListener('level_completed', (event: any) => {
    const data = JSON.parse(event.data);
    callback({ 
      type: 'LEVEL_COMPLETED', 
      level: data.level, 
      nodeCount: data.nodeCount, 
      edgeCount: data.edgeCount 
    });
  });
  
  eventSource.addEventListener('progress', (event: any) => {
    const data = JSON.parse(event.data);
    callback({ 
      type: 'PROGRESS', 
      level: data.level, 
      progress: data.progress,
      subAnalysis: data.subAnalysis 
    });
  });
  
  eventSource.addEventListener('done', (event: any) => {
    const data = JSON.parse(event.data);
    callback({ 
      type: 'DONE', 
      totalNodes: data.totalNodes, 
      totalEdges: data.totalEdges, 
      completedLevels: data.completedLevels 
    });
    eventSource.close();
  });
  
  eventSource.addEventListener('error', (event: any) => {
    const data = JSON.parse(event.data);
    callback({ type: 'ERROR', message: data.message, code: data.code });
  });
  
  // Cleanup function
  return () => {
    eventSource.close();
    callback({ type: 'STREAM_DISCONNECTED', reason: 'Manual disconnect' });
  };
};

export const discoveryMachine = createMachine<DiscoveryContext, DiscoveryEvent>({
  id: 'discovery',
  initial: 'idle',
  context: initialContext,
  predictableActionArguments: true,
  states: {
    idle: {
      on: {
        CONFIGURE: {
          target: 'configured',
          actions: assign({
            config: (_, event: any) => event.config,
            error: () => null,
          }),
        },
        RESTORE_SNAPSHOT: {
          target: 'configured',
          actions: assign({
            config: (_, event: any) => event.snapshot.config,
            graph: (_, event: any) => event.snapshot.graph,
            currentLevel: (_, event: any) => event.snapshot.currentLevel,
            levelCounts: (_, event: any) => event.snapshot.levelCounts,
            error: () => null,
            jobId: () => null,
            progress: () => ({}),
          }),
        },
      },
    },
    
    configured: {
      on: {
        START: {
          target: 'starting',
          cond: (context) => {
            return (
              context.config !== null &&
              context.config.niche.trim().length > 0 &&
              context.config.maxLevels > 0 &&
              context.config.maxNodesPerLevel > 0 &&
              context.config.sources.length > 0
            );
          },
          actions: assign({
            error: () => null,
          }),
        },
        CONFIGURE: {
          actions: assign({
            config: (_, event: any) => event.config,
            error: () => null,
          }),
        },
        RESTORE_SNAPSHOT: {
          actions: assign({
            config: (_, event: any) => event.snapshot.config,
            graph: (_, event: any) => event.snapshot.graph,
            currentLevel: (_, event: any) => event.snapshot.currentLevel,
            levelCounts: (_, event: any) => event.snapshot.levelCounts,
            error: () => null,
            jobId: () => null,
            progress: () => ({}),
          }),
        },
        SNAPSHOT: {
          actions: assign({
            snapshots: (context) => {
              if (!context.config) return context.snapshots;
              
              const snapshot = {
                id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                timestamp: new Date().toISOString(),
                config: context.config,
                graph: context.graph,
                currentLevel: context.currentLevel,
                levelCounts: context.levelCounts,
              };
              
              return [...context.snapshots, snapshot];
            },
          }),
        },
      },
    },
    
    starting: {
      invoke: {
        id: 'startJob',
        src: startJobService,
        onDone: {
          target: 'discovering',
          actions: assign({
            jobId: (_, event: any) => event.data.jobId,
          }),
        },
        onError: {
          target: 'configured',
          actions: assign({
            error: (_, event: any) => event.data?.message || 'Failed to start job',
          }),
        },
      },
      on: {
        CANCEL: {
          target: 'configured',
          actions: assign({
            jobId: () => null,
            graph: () => ({ nodes: [], edges: [] }),
            currentLevel: () => 0,
            levelCounts: () => ({}),
            error: () => null,
            progress: () => ({}),
          }),
        },
      },
    },
    
    discovering: {
      invoke: {
        id: 'sseStream',
        src: sseStreamService,
      },
      initial: 'active',
      states: {
        active: {
          on: {
            PAUSE: 'paused',
          },
        },
        paused: {
          on: {
            RESUME: 'active',
          },
        },
      },
      on: {
        CANCEL: {
          target: 'configured',
          actions: assign({
            jobId: () => null,
            graph: () => ({ nodes: [], edges: [] }),
            currentLevel: () => 0,
            levelCounts: () => ({}),
            error: () => null,
            progress: () => ({}),
          }),
        },
        SNAPSHOT: {
          actions: assign({
            snapshots: (context) => {
              if (!context.config) return context.snapshots;
              
              const snapshot = {
                id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                timestamp: new Date().toISOString(),
                config: context.config,
                graph: context.graph,
                currentLevel: context.currentLevel,
                levelCounts: context.levelCounts,
              };
              
              return [...context.snapshots, snapshot];
            },
          }),
        },
        
        // SSE Events
        LEVEL_STARTED: {
          actions: assign({
            currentLevel: (_, event: any) => event.level,
            levelCounts: (context, event: any) => ({
              ...context.levelCounts,
              [event.level]: 0,
            }),
          }),
        },
        NODE_FOUND: {
          actions: assign({
            graph: (context, event: any) => ({
              ...context.graph,
              nodes: [...context.graph.nodes, event.node],
            }),
            levelCounts: (context, event: any) => {
              const level = event.node.level;
              return {
                ...context.levelCounts,
                [level]: (context.levelCounts[level] || 0) + 1,
              };
            },
          }),
        },
        EDGE_FOUND: {
          actions: assign({
            graph: (context, event: any) => ({
              ...context.graph,
              edges: [...context.graph.edges, event.edge],
            }),
          }),
        },
        LEVEL_COMPLETED: {
          actions: assign({
            levelCounts: (context, event: any) => ({
              ...context.levelCounts,
              [event.level]: event.nodeCount,
            }),
            progress: (context, event: any) => ({
              ...context.progress,
              [event.level]: 1.0,
            }),
          }),
        },
        PROGRESS: {
          actions: assign({
            progress: (context, event: any) => ({
              ...context.progress,
              [event.level]: event.progress / 100, // Convert to 0-1 range
            }),
            subAnalysis: (context, event: any) => event.subAnalysis,
          }),
        },
        DONE: {
          target: 'complete',
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: (_, event: any) => event.message,
          }),
        },
        STREAM_DISCONNECTED: {
          target: 'error',
          actions: assign({
            error: (_, event: any) => `Stream disconnected: ${event.reason || 'Unknown reason'}`,
          }),
        },
      },
    },
    
    complete: {
      on: {
        CONFIGURE: {
          target: 'configured',
          actions: [
            assign({
              config: (_, event: any) => event.config,
              error: () => null,
            }),
            assign({
              jobId: () => null,
              graph: () => ({ nodes: [], edges: [] }),
              currentLevel: () => 0,
              levelCounts: () => ({}),
              progress: () => ({}),
            }),
          ],
        },
        CANCEL: {
          target: 'configured',
          actions: [
            // Call the cancellation service to stop backend processing
            (context) => {
              if (context.jobId) {
                cancelJobService(context)
                  .then(result => {
                    console.log('Job cancellation result:', result);
                  })
                  .catch(error => {
                    console.error('Failed to cancel job:', error);
                  });
              }
            },
            assign({
              jobId: () => null,
              graph: () => ({ nodes: [], edges: [] }),
              currentLevel: () => 0,
              levelCounts: () => ({}),
              error: () => null,
              progress: () => ({}),
            }),
          ],
        },
        SNAPSHOT: {
          actions: assign({
            snapshots: (context) => {
              if (!context.config) return context.snapshots;
              
              const snapshot = {
                id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                timestamp: new Date().toISOString(),
                config: context.config,
                graph: context.graph,
                currentLevel: context.currentLevel,
                levelCounts: context.levelCounts,
              };
              
              return [...context.snapshots, snapshot];
            },
          }),
        },
        RESTORE_SNAPSHOT: {
          target: 'configured',
          actions: assign({
            config: (_, event: any) => event.snapshot.config,
            graph: (_, event: any) => event.snapshot.graph,
            currentLevel: (_, event: any) => event.snapshot.currentLevel,
            levelCounts: (_, event: any) => event.snapshot.levelCounts,
            error: () => null,
            jobId: () => null,
            progress: () => ({}),
          }),
        },
      },
    },
    
    error: {
      on: {
        CONFIGURE: {
          target: 'configured',
          actions: [
            assign({
              config: (_, event: any) => event.config,
              error: () => null,
            }),
            assign({
              jobId: () => null,
              graph: () => ({ nodes: [], edges: [] }),
              currentLevel: () => 0,
              levelCounts: () => ({}),
              progress: () => ({}),
            }),
          ],
        },
        CANCEL: {
          target: 'configured',
          actions: assign({
            jobId: () => null,
            graph: () => ({ nodes: [], edges: [] }),
            currentLevel: () => 0,
            levelCounts: () => ({}),
            error: () => null,
            progress: () => ({}),
          }),
        },
        RESTORE_SNAPSHOT: {
          target: 'configured',
          actions: assign({
            config: (_, event: any) => event.snapshot.config,
            graph: (_, event: any) => event.snapshot.graph,
            currentLevel: (_, event: any) => event.snapshot.currentLevel,
            levelCounts: (_, event: any) => event.snapshot.levelCounts,
            error: () => null,
            jobId: () => null,
            progress: () => ({}),
          }),
        },
      },
    },
  },
});