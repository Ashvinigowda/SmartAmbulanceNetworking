import {
  Simulation,
  TopologyData,
  ReplayData,
  ScenarioComparison,
  SystemHealth
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async getSimulations(category?: string, priority?: string): Promise<{ count: number; simulations: Simulation[] }> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (priority) params.append('priority', priority);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/simulations${query}`);
    if (!res.ok) throw new Error('Failed to fetch simulations');
    return res.json();
  },

  async getSimulation(id: string): Promise<Simulation> {
    const res = await fetch(`${API_BASE}/simulations/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch simulation ${id}`);
    return res.json();
  },

  async getTopology(id: string): Promise<TopologyData> {
    const res = await fetch(`${API_BASE}/simulations/${id}/topology`);
    if (!res.ok) throw new Error(`Failed to fetch topology for ${id}`);
    return res.json();
  },

  async getEvents(id: string, limit: number = 1000, offset: number = 0): Promise<ReplayData> {
    const res = await fetch(`${API_BASE}/simulations/${id}/events?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error(`Failed to fetch events for ${id}`);
    return res.json();
  },

  async getComparison(baseId?: string, proposedId?: string): Promise<ScenarioComparison> {
    const params = new URLSearchParams();
    if (baseId) params.append('base', baseId);
    if (proposedId) params.append('proposed', proposedId);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/compare${query}`);
    if (!res.ok) throw new Error('Failed to fetch scenario comparison');
    return res.json();
  },

  async getScenarioMatrix(): Promise<{ total_experiments: number; suites: Record<string, Simulation[]> }> {
    const res = await fetch(`${API_BASE}/scenarios/matrix`);
    if (!res.ok) throw new Error('Failed to fetch scenario matrix');
    return res.json();
  },

  async runSimulation(config: any): Promise<any> {
    const res = await fetch(`${API_BASE}/simulations/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to trigger simulation execution');
    }
    return res.json();
  },

  getExportUrl(simId: string, format: 'csv' | 'json'): string {
    return `${API_BASE}/reports/${simId}/export?format=${format}`;
  },

  getSummaryReportUrl(simId: string): string {
    return `${API_BASE}/reports/${simId}/summary`;
  }
};
