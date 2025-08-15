import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../lib/config';
import { DiscoveryConfigSchema, StartDiscoveryResponseSchema, type DiscoveryConfigInput } from './services/discovery.validators';
import { DiscoveryServiceImpl } from './services/discovery.service';
import { InMemoryDiscoveryRepo } from './persistence/discovery.repo';

export async function discoveryRoutes(app: FastifyInstance, options: { config?: AppConfig }) {
  // Create service instances with config
  const discoveryRepo = new InMemoryDiscoveryRepo();
  const discoveryService = new DiscoveryServiceImpl(discoveryRepo, {
    redditClientId: options.config?.redditClientId,
    redditClientSecret: options.config?.redditClientSecret,
    redditUserAgent: options.config?.redditUserAgent,
    openaiApiKey: options.config?.openaiApiKey,
  });
  // POST /api/discover - Start a discovery job
  app.post('/api/discover', {
    schema: {
      body: DiscoveryConfigSchema,
      response: {
        200: StartDiscoveryResponseSchema,
      },
    },
  }, async (request, reply) => {
    const config = request.body as DiscoveryConfigInput;
    
    try {
      const result = await discoveryService.startDiscovery(config);
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error, 'Failed to start discovery job');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to start discovery job',
      });
    }
  });

  // GET /api/discover/:jobId - Get job status
  app.get('/api/discover/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    
    try {
      const job = await discoveryService.getJobStatus(jobId);
      
      if (!job) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Discovery job not found',
        });
      }
      
      return reply.code(200).send(job);
    } catch (error) {
      request.log.error(error, 'Failed to get job status');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get job status',
      });
    }
  });

  // DELETE /api/discover/:jobId - Cancel a discovery job
  app.delete('/api/discover/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    
    try {
      const result = await discoveryService.cancelJob(jobId);
      
      if (!result.success) {
        return reply.code(404).send({
          error: 'Not Found',
          message: result.message,
        });
      }
      
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error, 'Failed to cancel job');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cancel job',
      });
    }
  });

  // GET /api/discover/:jobId/stream - SSE endpoint for real-time updates
  app.get('/api/discover/:jobId/stream', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Check if job exists
    const job = await discoveryService.getJobStatus(jobId);
    if (!job) {
      reply.raw.write(`event: error\n`);
      reply.raw.write(`data: ${JSON.stringify({ message: 'Job not found', code: 'JOB_NOT_FOUND' })}\n\n`);
      reply.raw.end();
      return;
    }

    // Send initial connection event
    reply.raw.write(`event: connected\n`);
    reply.raw.write(`data: ${JSON.stringify({ jobId, status: job.status })}\n\n`);

        // Stream real discovery data
    const streamRealData = async () => {
      try {
        // Get the current job graph (real discovered data)  
        const jobGraph = await discoveryRepo.getJobGraph(jobId);
        
        if (jobGraph.nodes.length === 0) {
          // Job hasn't completed yet, send progress updates
          const pollInterval = setInterval(async () => {
            try {
              const updatedJob = await discoveryService.getJobStatus(jobId);
              const updatedGraph = await discoveryRepo.getJobGraph(jobId);
              
              if (!updatedJob) {
                clearInterval(pollInterval);
                reply.raw.write(`event: error\n`);
                reply.raw.write(`data: ${JSON.stringify({ message: 'Job not found', code: 'JOB_NOT_FOUND' })}\n\n`);
                reply.raw.end();
                return;
              }

              // Send progress update with sub-analysis data
              reply.raw.write(`event: progress\n`);
              reply.raw.write(`data: ${JSON.stringify({ 
                progress: updatedJob.status === 'complete' ? 100 : (updatedJob.currentLevel / job.config.maxLevels) * 100,
                currentLevel: updatedJob.currentLevel,
                status: updatedJob.status,
                subAnalysis: updatedJob.subAnalysis
              })}\n\n`);

              // If job is complete, send all the real data
              if (updatedJob.status === 'complete' && updatedGraph.nodes.length > 0) {
                clearInterval(pollInterval);
                
                // Group nodes by level for proper streaming
                const nodesByLevel = updatedGraph.nodes.reduce((acc, node) => {
                  if (!acc[node.level]) acc[node.level] = [];
                  acc[node.level].push(node);
                  return acc;
                }, {} as Record<number, any[]>);

                const levels = Object.keys(nodesByLevel).map(Number).sort();
                
                // Stream nodes level by level
                for (const level of levels) {
                  reply.raw.write(`event: level_started\n`);
                  reply.raw.write(`data: ${JSON.stringify({ level })}\n\n`);
                  
                  for (const node of nodesByLevel[level]) {
                    reply.raw.write(`event: node_found\n`);
                    reply.raw.write(`data: ${JSON.stringify({ node })}\n\n`);
                  }
                  
                  reply.raw.write(`event: level_completed\n`);
                  reply.raw.write(`data: ${JSON.stringify({ 
                    level, 
                    nodeCount: nodesByLevel[level].length,
                    edgeCount: updatedGraph.edges.filter(e => {
                      const sourceNode = updatedGraph.nodes.find(n => n.id === e.source);
                      return sourceNode?.level === level;
                    }).length
                  })}\n\n`);
                }

                // Send all edges
                for (const edge of updatedGraph.edges) {
                  reply.raw.write(`event: edge_found\n`);
                  reply.raw.write(`data: ${JSON.stringify({ edge })}\n\n`);
                }

                // Send completion
                reply.raw.write(`event: done\n`);
                reply.raw.write(`data: ${JSON.stringify({
                  totalNodes: updatedGraph.nodes.length,
                  totalEdges: updatedGraph.edges.length,
                  completedLevels: levels.length
                })}\n\n`);
                
                reply.raw.end();
              }
              
              // If job failed
              if (updatedJob.status === 'error') {
                clearInterval(pollInterval);
                reply.raw.write(`event: error\n`);
                reply.raw.write(`data: ${JSON.stringify({ 
                  message: updatedJob.error || 'Discovery failed', 
                  code: 'DISCOVERY_ERROR' 
                })}\n\n`);
                reply.raw.end();
              }
              
            } catch (error) {
              clearInterval(pollInterval);
              reply.raw.write(`event: error\n`);
              reply.raw.write(`data: ${JSON.stringify({ 
                message: 'Failed to get job updates', 
                code: 'POLLING_ERROR' 
              })}\n\n`);
              reply.raw.end();
            }
          }, 1000); // Poll every second
          
        } else {
          // Job already complete, send all data immediately
          const nodesByLevel = jobGraph.nodes.reduce((acc, node) => {
            if (!acc[node.level]) acc[node.level] = [];
            acc[node.level].push(node);
            return acc;
          }, {} as Record<number, any[]>);

          const levels = Object.keys(nodesByLevel).map(Number).sort();
          
          // Stream the completed data
          for (const level of levels) {
            reply.raw.write(`event: level_started\n`);
            reply.raw.write(`data: ${JSON.stringify({ level })}\n\n`);
            
            for (const node of nodesByLevel[level]) {
              reply.raw.write(`event: node_found\n`);
              reply.raw.write(`data: ${JSON.stringify({ node })}\n\n`);
            }
          }

          // Send all edges
          for (const edge of jobGraph.edges) {
            reply.raw.write(`event: edge_found\n`);
            reply.raw.write(`data: ${JSON.stringify({ edge })}\n\n`);
          }

          // Send completion
          reply.raw.write(`event: done\n`);
          reply.raw.write(`data: ${JSON.stringify({
            totalNodes: jobGraph.nodes.length,
            totalEdges: jobGraph.edges.length,
            completedLevels: levels.length
          })}\n\n`);
          
          reply.raw.end();
        }
      } catch (error) {
        reply.raw.write(`event: error\n`);
        reply.raw.write(`data: ${JSON.stringify({ 
          message: 'Failed to stream discovery data', 
          code: 'STREAM_ERROR' 
        })}\n\n`);
        reply.raw.end();
      }
    };

    streamRealData();

    // Handle client disconnect
    request.raw.on('close', () => {
      reply.raw.end();
    });
  });
}
