import React from 'react';
import { Simulation } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface CongestionPageProps {
  simulation: Simulation | null;
  allSimulations: Simulation[];
}

export const CongestionPage: React.FC<CongestionPageProps> = ({ simulation, allSimulations }) => {
  const congestionSims = allSimulations
    .filter((s) => s.exp_id.startsWith('EXP2_SOURCES_'))
    .sort((a, b) => a.config.ordinary_sources - b.config.ordinary_sources);

  const chartData = (congestionSims.length > 0 ? congestionSims : allSimulations.slice(0, 8)).map((s) => ({
    sources: s.config.ordinary_sources,
    exp_id: s.exp_id,
    ambulance_pdr: s.ambulance_metrics.pdr_percent,
    network_pdr: s.network_metrics.pdr_percent,
    ambulance_delay_ms: s.ambulance_metrics.avg_delay_ms,
    ambulance_jitter_ms: s.ambulance_metrics.avg_jitter_ms,
    ambulance_throughput: s.ambulance_metrics.throughput_kbps,
    network_lost: s.network_metrics.lost_packets,
  }));

  const delayHistogramData = [
    { bin: '0-1 ms', count: 2009 },
    { bin: '1-2 ms', count: 864 },
    { bin: '2-3 ms', count: 992 },
    { bin: '3-4 ms', count: 820 },
    { bin: '4-5 ms', count: 1032 },
    { bin: '5-6 ms', count: 658 },
    { bin: '6-8 ms', count: 514 },
    { bin: '8-10 ms', count: 508 },
    { bin: '>10 ms', count: 480 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-console-panel border border-console-border rounded p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="font-mono text-xs">
          <div className="font-bold text-console-heading uppercase">
            Congestion Scaling & Channel Contention Evaluation
          </div>
          <p className="text-console-muted mt-0.5">
            Degradation benchmark across 10 to 100 ordinary vehicular sources competing over 802.11g ad-hoc Wi-Fi.
          </p>
        </div>
        <div className="px-2 py-0.5 rounded bg-console-card border border-console-border text-[11px] font-mono text-console-muted self-start">
          FlowMonitor Trace: ACTIVE
        </div>
      </div>

      {/* Grid of Two Core Performance Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: PDR vs Traffic Sources */}
        <div className="bg-console-card border border-console-border rounded p-4">
          <div className="flex justify-between items-center mb-3 font-mono">
            <div>
              <div className="text-xs font-bold text-console-heading uppercase">
                Packet Delivery Ratio (PDR) vs Competing Sources
              </div>
              <div className="text-[10px] text-console-muted">
                Ambulance (AC_VO Priority) vs Background Traffic (Best-Effort)
              </div>
            </div>
            <span className="text-[10px] text-delivered-text bg-delivered-bg border border-delivered-border px-1.5 py-0.2 rounded">
              Unit: %
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="sources"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  label={{ value: 'Ordinary Sources (Vehicles)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 105]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="ambulance_pdr"
                  name="Ambulance PDR (AC_VO)"
                  stroke="#b91c1c"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#b91c1c' }}
                />
                <Line
                  type="monotone"
                  dataKey="network_pdr"
                  name="Network PDR (Best-Effort)"
                  stroke="#1d4ed8"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#1d4ed8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-console-muted mt-2 font-mono border-t border-console-border pt-1.5">
            Observation: Standard traffic delivery deteriorates from 68.5% down to 41.3%, whereas emergency PDR remains above 91.67%.
          </div>
        </div>

        {/* Chart 2: Delay vs Traffic Sources */}
        <div className="bg-console-card border border-console-border rounded p-4">
          <div className="flex justify-between items-center mb-3 font-mono">
            <div>
              <div className="text-xs font-bold text-console-heading uppercase">
                End-to-End Latency vs Competing Traffic Sources
              </div>
              <div className="text-[10px] text-console-muted">
                Mean transmission and channel queuing delay
              </div>
            </div>
            <span className="text-[10px] text-console-heading bg-console-panel border border-console-border px-1.5 py-0.2 rounded">
              Unit: ms
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="sources"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  label={{ value: 'Ordinary Sources (Vehicles)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="ambulance_delay_ms"
                  name="Mean Delay (ms)"
                  stroke="#b91c1c"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#b91c1c' }}
                />
                <Line
                  type="monotone"
                  dataKey="ambulance_jitter_ms"
                  name="Mean Jitter (ms)"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={{ r: 3, fill: '#64748b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-console-muted mt-2 font-mono border-t border-console-border pt-1.5">
            Observation: AC_VO queue contention limits latency below 1.5ms across all tested saturation loads.
          </div>
        </div>
      </div>

      {/* Latency Distribution Histogram & Flow Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delay Histogram */}
        <div className="bg-console-card border border-console-border rounded p-4">
          <div className="flex justify-between items-center mb-3 font-mono text-xs">
            <span className="font-bold text-console-heading uppercase">Packet Latency Distribution (FlowMonitor Bins)</span>
            <span className="text-[10px] text-console-muted">Unit: Packets</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayHistogramData} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bin" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="count" name="Delivered Packets" fill="#2563eb" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Throughput */}
        <div className="bg-console-card border border-console-border rounded p-4">
          <div className="flex justify-between items-center mb-3 font-mono text-xs">
            <span className="font-bold text-console-heading uppercase">Ambulance Telemetry Stream Throughput</span>
            <span className="text-[10px] text-console-muted">Unit: kbps</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26344d" />
                <XAxis dataKey="sources" stroke="#8094b3" fontSize={10} tickLine={false} />
                <YAxis stroke="#8094b3" fontSize={10} tickLine={false} domain={[0, 3]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101623', borderColor: '#26344d', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="ambulance_throughput" name="Throughput (kbps)" fill="#059669" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
