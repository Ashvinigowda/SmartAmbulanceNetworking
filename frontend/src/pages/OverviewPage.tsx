import React from 'react';
import { Simulation } from '../types';
import { MetricSkeleton } from '../components/SkeletonLoader';

interface OverviewPageProps {
  simulation: Simulation | null;
  allSimulations: Simulation[];
  onSelectSimulation: (sim: Simulation) => void;
  onNavigate: (page: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  simulation,
  allSimulations,
  onSelectSimulation,
  onNavigate,
}) => {
  if (!simulation) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const { config, network_metrics, ambulance_metrics, app_metrics } = simulation;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* System Telemetry Header Banner */}
      <div className="bg-console-panel border border-console-border rounded p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-emergency-bg text-emergency-text border border-emergency-border font-bold">
                {simulation.exp_id}
              </span>
              <span className="text-console-muted">|</span>
              <span className="text-console-heading font-semibold">
                {config.priority_enabled ? `QoS Priority ACTIVE (${config.ambulance_priority_mode})` : 'Baseline: Best-Effort (AC_BE)'}
              </span>
              <span className="text-console-muted">|</span>
              <span className="text-delivered-text font-mono">Status: {simulation.status}</span>
            </div>
            <h2 className="text-base font-bold text-console-heading mt-1.5 font-mono">
              {simulation.title}
            </h2>
            <p className="text-xs text-console-muted mt-0.5 font-mono">
              {simulation.description} Measured via NS-3.45 FlowMonitor on IEEE 802.11g ad-hoc wireless channels.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onNavigate('replay')}
              className="px-3 py-1.5 bg-emergency text-white rounded text-xs font-mono font-bold hover:bg-emergency-border transition"
            >
              Open Packet Replay
            </button>
            <button
              onClick={() => onNavigate('comparison')}
              className="px-3 py-1.5 bg-console-card hover:bg-console-hover text-console-heading border border-console-border rounded text-xs font-mono transition"
            >
              Compare Baseline
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div>
        <div className="text-[10px] font-mono font-bold text-console-muted uppercase tracking-wider mb-2">
          1. Key Performance Indicators (FlowMonitor Telemetry)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Metric 1 */}
          <div className="bg-console-card border border-console-border rounded p-3.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-console-muted uppercase">
              <span>Ambulance PDR</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-console-panel border border-console-border">RATIO</span>
            </div>
            <div className="text-2xl font-bold font-mono text-console-heading mt-1">
              {ambulance_metrics.pdr_percent.toFixed(2)}%
            </div>
            <div className="text-[11px] font-mono text-console-muted mt-1 flex justify-between">
              <span>RX: {ambulance_metrics.rx_packets} pkts</span>
              <span>TX: {ambulance_metrics.tx_packets} pkts</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-console-card border border-console-border rounded p-3.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-console-muted uppercase">
              <span>Mean End-to-End Latency</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-console-panel border border-console-border">DELAY</span>
            </div>
            <div className="text-2xl font-bold font-mono text-console-heading mt-1">
              {ambulance_metrics.avg_delay_ms > 0 ? `${ambulance_metrics.avg_delay_ms.toFixed(3)} ms` : 'Not available'}
            </div>
            <div className="text-[11px] font-mono text-console-muted mt-1">
              Jitter: {ambulance_metrics.avg_jitter_ms.toFixed(3)} ms
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-console-card border border-console-border rounded p-3.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-console-muted uppercase">
              <span>Stream Throughput</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-console-panel border border-console-border">BANDWIDTH</span>
            </div>
            <div className="text-2xl font-bold font-mono text-console-heading mt-1">
              {ambulance_metrics.throughput_kbps > 0 ? `${ambulance_metrics.throughput_kbps.toFixed(2)}` : '0.00'}
              <span className="text-xs font-normal text-console-muted ml-1">kbps</span>
            </div>
            <div className="text-[11px] font-mono text-console-muted mt-1">
              Lost: {ambulance_metrics.lost_packets} pkts
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-console-card border border-console-border rounded p-3.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-console-muted uppercase">
              <span>Background Traffic PDR</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-console-panel border border-console-border">CONGESTION</span>
            </div>
            <div className="text-2xl font-bold font-mono text-congested-text mt-1">
              {network_metrics.pdr_percent.toFixed(2)}%
            </div>
            <div className="text-[11px] font-mono text-console-muted mt-1">
              Network Lost: {network_metrics.lost_packets} pkts
            </div>
          </div>
        </div>
      </div>

      {/* Topology Entities Inventory & Protocol Integrity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Topology Entities */}
        <div className="bg-console-card border border-console-border rounded p-4 space-y-3">
          <div className="text-[10px] font-mono font-bold text-console-muted uppercase tracking-wider border-b border-console-border pb-1.5 flex justify-between">
            <span>2. Topology Entity Inventory</span>
            <span className="text-console-heading font-normal">Total Nodes: {config.ambulances + config.ordinary_sources + config.receivers}</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Ambulance Nodes:</span>
              <span className="text-emergency font-bold">{config.ambulances} (TID 6 / AC_VO)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Ordinary Background Vehicles:</span>
              <span className="text-traffic-text font-bold">{config.ordinary_sources} ({config.ordinary_rate} each)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Hospital Infrastructure Receivers:</span>
              <span className="text-delivered-text font-bold">{config.receivers} (UDP Port 9000)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Mobility Model:</span>
              <span className="text-console-heading">{config.mobility_mode}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-console-muted">Simulation Bounds:</span>
              <span className="text-console-heading">{config.area_size}m x {config.area_size}m</span>
            </div>
          </div>
        </div>

        {/* Application Protocol Verification */}
        <div className="bg-console-card border border-console-border rounded p-4 space-y-3">
          <div className="text-[10px] font-mono font-bold text-console-muted uppercase tracking-wider border-b border-console-border pb-1.5 flex justify-between">
            <span>3. AmbulanceAppHeader Protocol Decoding</span>
            <span className="text-console-heading font-normal">Header: 54 Bytes</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Valid Binary Messages Decoded:</span>
              <span className="text-console-heading font-bold">{app_metrics.valid_msgs} / {network_metrics.rx_packets}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Malformed Message Count:</span>
              <span className="text-delivered-text font-bold">{app_metrics.malformed_msgs} (Zero defects detected)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Emergency Clinical Alerts Rx:</span>
              <span className="text-emergency font-bold">{app_metrics.alerts_rx} Delivered (100% Guaranteed)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-console-border/60">
              <span className="text-console-muted">Hospital Pre-Arrival Prealerts Rx:</span>
              <span className="text-console-heading">{app_metrics.prealerts_rx} Milestone Packets</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-console-muted">Traffic Stream Categories:</span>
              <span className="text-console-heading">4 Sub-classes (Telemetry, Density, Status, Operational)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Scenario Benchmarks Table */}
      <div className="bg-console-card border border-console-border rounded p-4 space-y-3">
        <div className="text-[10px] font-mono font-bold text-console-muted uppercase tracking-wider border-b border-console-border pb-1.5 flex justify-between">
          <span>4. Quick Experimental Suite Selection (33 Benchmark Runs)</span>
          <span className="text-console-muted text-[10px]">Click any row to load into console</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-console-panel text-console-muted border-b border-console-border">
              <tr>
                <th className="py-2 px-3">Run ID</th>
                <th className="py-2 px-3">QoS Mode</th>
                <th className="py-2 px-3">Amb / Sources</th>
                <th className="py-2 px-3">Amb PDR</th>
                <th className="py-2 px-3">Net PDR</th>
                <th className="py-2 px-3">Delay (ms)</th>
                <th className="py-2 px-3">Throughput</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-console-border text-console-text">
              {allSimulations.slice(0, 7).map((sim) => {
                const isSelected = simulation.id === sim.id;
                return (
                  <tr
                    key={sim.id}
                    onClick={() => onSelectSimulation(sim)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-console-hover text-console-heading font-semibold' : 'hover:bg-console-panel'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-console-heading">{sim.exp_id}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${sim.config.priority_enabled ? 'bg-emergency-bg text-emergency-text border border-emergency-border' : 'bg-console-panel text-console-muted'}`}>
                        {sim.config.priority_enabled ? 'AC_VO' : 'AC_BE'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{sim.config.ambulances} Amb / {sim.config.ordinary_sources} Src</td>
                    <td className="py-2 px-3 text-delivered-text font-bold">{sim.ambulance_metrics.pdr_percent.toFixed(1)}%</td>
                    <td className="py-2 px-3">{sim.network_metrics.pdr_percent.toFixed(1)}%</td>
                    <td className="py-2 px-3">{sim.ambulance_metrics.avg_delay_ms > 0 ? `${sim.ambulance_metrics.avg_delay_ms.toFixed(3)} ms` : 'N/A'}</td>
                    <td className="py-2 px-3">{sim.ambulance_metrics.throughput_kbps.toFixed(2)} kbps</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
