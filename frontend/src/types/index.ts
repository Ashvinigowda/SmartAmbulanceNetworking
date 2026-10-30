export interface SimulationConfig {
  ambulances: number;
  ordinary_sources: number;
  receivers: number;
  mobility_mode: string;
  area_size: number;
  prop_model: string;
  phy_rate: string;
  tx_power_dbm: number;
  priority_enabled: boolean;
  ambulance_priority_mode: string;
  priority_tid: number;
  ordinary_rate: string;
  ordinary_pkt_size: number;
  duration_sec: number;
}

export interface NetworkMetrics {
  tx_packets: number;
  rx_packets: number;
  lost_packets: number;
  pdr_percent: number;
}

export interface AmbulanceMetrics {
  tx_packets: number;
  rx_packets: number;
  lost_packets: number;
  pdr_percent: number;
  avg_delay_ms: number;
  avg_jitter_ms: number;
  throughput_kbps: number;
}

export interface AppMetrics {
  valid_msgs: number;
  malformed_msgs: number;
  alerts_rx: number;
  prealerts_rx: number;
  ordinary_rx: number;
}

export interface Simulation {
  id: string;
  index: number;
  exp_id: string;
  run: number;
  title: string;
  description: string;
  config: SimulationConfig;
  network_metrics: NetworkMetrics;
  ambulance_metrics: AmbulanceMetrics;
  app_metrics: AppMetrics;
  has_anim_trace: boolean;
  has_flow_xml: boolean;
  status: string;
}

export interface TopologyNode {
  id: number;
  name: string;
  type: 'ambulance' | 'ordinary' | 'hospital';
  x: number;
  y: number;
  color: string;
  size: number;
  ip: string;
  speed?: number;
  heading?: number;
  eta?: number;
}

export interface TopologyLink {
  source: number;
  target: number;
  type: string;
}

export interface TopologyData {
  simulation_id: string;
  exp_id?: string;
  source: string;
  nodes: TopologyNode[];
  links: TopologyLink[];
  bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  node_count: number;
  ambulance_count: number;
  ordinary_count: number;
  hospital_count: number;
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
}

export interface ReplayEvent {
  id: string;
  time: number;
  from_node_id: number;
  to_node_id: number;
  from_name: string;
  to_name: string;
  msg_type: string;
  priority: string;
  status: 'delivered' | 'dropped';
  latency_ms: number;
}

export interface ReplayData {
  simulation_id: string;
  exp_id: string;
  total_events: number;
  limit: number;
  offset: number;
  duration: number;
  nodes: TopologyNode[];
  trajectories: Record<string, TrajectoryPoint[]>;
  events: ReplayEvent[];
}

export interface ScenarioComparison {
  baseline: {
    id: string;
    exp_id: string;
    title: string;
    priority: string;
    pdr_percent: number;
    avg_delay_ms: number;
    avg_jitter_ms: number;
    throughput_kbps: number;
    tx_packets: number;
    rx_packets: number;
    lost_packets: number;
    net_pdr_percent: number;
  };
  proposed: {
    id: string;
    exp_id: string;
    title: string;
    priority: string;
    pdr_percent: number;
    avg_delay_ms: number;
    avg_jitter_ms: number;
    throughput_kbps: number;
    tx_packets: number;
    rx_packets: number;
    lost_packets: number;
    net_pdr_percent: number;
  };
  comparison: {
    pdr_change_percent: number;
    delay_reduction_percent: number;
    jitter_reduction_percent: number;
    throughput_change_percent: number;
    delay_delta_ms: number;
    summary: string;
  };
}

export interface SystemHealth {
  status: string;
  service: string;
  version: string;
  ns3_version: string;
  python_version: string;
  system: {
    memory_total_mb: number;
    memory_available_mb: number;
    memory_percent_used: number;
    cpu_percent: number;
  };
}
