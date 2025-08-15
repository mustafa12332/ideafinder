import type { DiscoveryJob, DiscoveryConfig, DiscoveryNode, DiscoveryEdge, DiscoveryGraph } from '../types';

export interface DiscoveryRepo {
  createJob(config: DiscoveryConfig): Promise<DiscoveryJob>;
  getJob(jobId: string): Promise<DiscoveryJob | null>;
  updateJobStatus(jobId: string, status: DiscoveryJob['status'], error?: string): Promise<void>;
  updateJobCurrentLevel(jobId: string, level: number): Promise<void>;
  updateJobSubAnalysis(jobId: string, subAnalysis: NonNullable<DiscoveryJob['subAnalysis']>): Promise<void>;
  addNode(jobId: string, node: DiscoveryNode): Promise<void>;
  addEdge(jobId: string, edge: DiscoveryEdge): Promise<void>;
  getJobGraph(jobId: string): Promise<DiscoveryGraph>;
}

export class InMemoryDiscoveryRepo implements DiscoveryRepo {
  private jobs = new Map<string, DiscoveryJob>();
  private jobGraphs = new Map<string, DiscoveryGraph>();

  async createJob(config: DiscoveryConfig): Promise<DiscoveryJob> {
    const job: DiscoveryJob = {
      id: crypto.randomUUID(),
      config,
      status: 'starting',
      currentLevel: 0,
      totalNodes: 0,
      totalEdges: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.jobs.set(job.id, job);
    this.jobGraphs.set(job.id, { nodes: [], edges: [] });
    return job;
  }

  async getJob(jobId: string): Promise<DiscoveryJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async updateJobStatus(jobId: string, status: DiscoveryJob['status'], error?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date().toISOString();
      if (error) {
        job.error = error;
      }
      this.jobs.set(jobId, job);
    }
  }

  async updateJobCurrentLevel(jobId: string, level: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.currentLevel = level;
      job.updatedAt = new Date().toISOString();
      this.jobs.set(jobId, job);
    }
  }

  async updateJobSubAnalysis(jobId: string, subAnalysis: NonNullable<DiscoveryJob['subAnalysis']>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.subAnalysis = subAnalysis;
      job.updatedAt = new Date().toISOString();
      this.jobs.set(jobId, job);
    }
  }

  async addNode(jobId: string, node: DiscoveryNode): Promise<void> {
    const graph = this.jobGraphs.get(jobId);
    if (graph) {
      graph.nodes.push(node);
      this.jobGraphs.set(jobId, graph);
      
      // Update job stats
      const job = this.jobs.get(jobId);
      if (job) {
        job.totalNodes = graph.nodes.length;
        job.updatedAt = new Date().toISOString();
        this.jobs.set(jobId, job);
      }
    }
  }

  async addEdge(jobId: string, edge: DiscoveryEdge): Promise<void> {
    const graph = this.jobGraphs.get(jobId);
    if (graph) {
      graph.edges.push(edge);
      this.jobGraphs.set(jobId, graph);
      
      // Update job stats
      const job = this.jobs.get(jobId);
      if (job) {
        job.totalEdges = graph.edges.length;
        job.updatedAt = new Date().toISOString();
        this.jobs.set(jobId, job);
      }
    }
  }

  async getJobGraph(jobId: string): Promise<DiscoveryGraph> {
    return this.jobGraphs.get(jobId) || { nodes: [], edges: [] };
  }
}
