import React, { useState, useEffect } from 'react';
import { Simulation, ScenarioComparison } from '../types';
import { api } from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ComparisonPageProps {
  allSimulations: Simulation[];
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({ allSimulations }) => {
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const baselineSims = allSimulations.filter(
    (s) => !s.config.priority_enabled || s.exp_id.includes('NO_PRIORITY') || s.exp_id.includes('OFF')
  );
  const proposedSims = allSimulations.filter(
    (s) => s.config.priority_enabled && (s.exp_id.includes('PRIORITY') || s.exp_id.includes('ON') || s.config.ambulance_priority_mode.includes('VO'))
  );

  const defaultBaseId = baselineSims.find((s) => s.exp_id.includes('EXP9'))?.id || baselineSims[0]?.id || '';
  const defaultPropId = proposedSims.find((s) => s.exp_id.includes('EXP9'))?.id || proposedSims[0]?.id || '';

  const [baseId, setBaseId] = useState<string>(defaultBaseId);
  const [propId, setPropId] = useState<string>(defaultPropId);

  useEffect(() => {
    if (!baseId && defaultBaseId) setBaseId(defaultBaseId);
    if (!propId && defaultPropId) setPropId(defaultPropId);
  }, [defaultBaseId, defaultPropId, baseId, propId]);

  const fetchComparison = () => {
    setLoading(true);
    setError(null);

    const b = baseId || defaultBaseId;
    const p = propId || defaultPropId;

    api
      .getComparison(b, p)
      .then((data) => {
        setComparison(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to calculate scenario comparison');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComparison();
  }, [baseId, propId, defaultBaseId, defaultPropId]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="h-12 bg-console-card border border-console-border rounded skeleton-shimmer" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-console-card border border-console-border rounded skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="p-12 text-center font-mono text-xs space-y-3">
        <p className="text-emergency">{error || 'Comparison data unavailable'}</p>
        <button
          onClick={fetchComparison}
          className="px-3 py-1.5 bg-console-card hover:bg-console-hover text-console-heading border border-console-border rounded text-xs font-mono"
        >
          [Retry Comparison Fetch]
        </button>
      </div>
    );
  }

  const { baseline, proposed, comparison: compStats } = comparison;

  const delayChartData = [
    {
      metric: 'Mean Delay (ms)',
      'Baseline (Best Effort)': baseline.avg_delay_ms,
      'Proposed (QoS VO)': proposed.avg_delay_ms,
    },
    {
      metric: 'Jitter (ms)',
      'Baseline (Best Effort)': baseline.avg_jitter_ms,
      'Proposed (QoS VO)': proposed.avg_jitter_ms,
    },
  ];

  const pdrChartData = [
    {
      metric: 'Ambulance PDR (%)',
      'Baseline (Best Effort)': baseline.pdr_percent,
      'Proposed (QoS VO)': proposed.pdr_percent,
    },
    {
      metric: 'Network PDR (%)',
      'Baseline (Best Effort)': baseline.net_pdr_percent,
      'Proposed (QoS VO)': proposed.net_pdr_percent,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Scenario Selection */}
      <div className="bg-console-panel border border-console-border rounded p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
        <div>
          <div className="font-bold text-console-heading uppercase">
            Baseline vs Proposed QoS Comparative Evaluation
          </div>
          <p className="text-console-muted mt-0.5">
            Direct benchmark comparing unprioritized standard traffic against IEEE 802.11e EDCA emergency prioritization.
          </p>
        </div>

        {/* Pair selector */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="bg-console-card border border-console-border text-console-muted rounded px-2.5 py-1 focus:outline-none"
          >
            {baselineSims.map((s) => (
              <option key={s.id} value={s.id}>
                Baseline: {s.exp_id} ({s.config.ordinary_sources} Sources)
              </option>
            ))}
          </select>
          <span className="text-console-muted">vs</span>
          <select
            value={propId}
            onChange={(e) => setPropId(e.target.value)}
            className="bg-console-card border border-emergency-border text-console-heading rounded px-2.5 py-1 focus:outline-none"
          >
            {proposedSims.map((s) => (
              <option key={s.id} value={s.id}>
                Proposed: {s.exp_id} ({s.config.ordinary_sources} Sources)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Improvement Metrics Strip - 4-Column Technical Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="bg-console-card border border-console-border rounded p-3">
          <div className="text-[10px] text-console-muted uppercase">Latency Reduction</div>
          <div className="text-2xl font-bold text-delivered-text mt-1">
            {compStats.delay_reduction_percent > 0 ? `-${compStats.delay_reduction_percent}%` : `${compStats.delay_reduction_percent}%`}
          </div>
          <div className="text-[10px] text-console-muted mt-1">
            {baseline.avg_delay_ms.toFixed(2)}ms to {proposed.avg_delay_ms.toFixed(2)}ms
          </div>
        </div>

        <div className="bg-console-card border border-console-border rounded p-3">
          <div className="text-[10px] text-console-muted uppercase">Ambulance PDR</div>
          <div className="text-2xl font-bold text-console-heading mt-1">
            {proposed.pdr_percent.toFixed(1)}%
          </div>
          <div className="text-[10px] text-console-muted mt-1">
            Delta: {compStats.pdr_change_percent >= 0 ? `+${compStats.pdr_change_percent}%` : `${compStats.pdr_change_percent}%`}
          </div>
        </div>

        <div className="bg-console-card border border-console-border rounded p-3">
          <div className="text-[10px] text-console-muted uppercase">Jitter Reduction</div>
          <div className="text-2xl font-bold text-console-heading mt-1">
            {compStats.jitter_reduction_percent > 0 ? `-${compStats.jitter_reduction_percent}%` : `${compStats.jitter_reduction_percent}%`}
          </div>
          <div className="text-[10px] text-console-muted mt-1">
            {baseline.avg_jitter_ms.toFixed(2)}ms to {proposed.avg_jitter_ms.toFixed(2)}ms
          </div>
        </div>

        <div className="bg-console-card border border-console-border rounded p-3">
          <div className="text-[10px] text-console-muted uppercase">Throughput Delta</div>
          <div className="text-2xl font-bold text-console-heading mt-1">
            {compStats.throughput_change_percent >= 0 ? `+${compStats.throughput_change_percent}%` : `${compStats.throughput_change_percent}%`}
          </div>
          <div className="text-[10px] text-console-muted mt-1">
            {proposed.throughput_kbps.toFixed(2)} kbps
          </div>
        </div>
      </div>

      {/* Side-by-Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-console-card border border-console-border rounded p-4 font-mono">
          <div className="text-xs font-bold text-console-heading uppercase mb-1">Latency Comparison (Lower is Better)</div>
          <div className="text-[10px] text-console-muted mb-3">Delay & Jitter in milliseconds</div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayChartData} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="Baseline (Best Effort)" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Proposed (QoS VO)" fill="#b91c1c" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-console-card border border-console-border rounded p-4 font-mono">
          <div className="text-xs font-bold text-console-heading uppercase mb-1">Delivery Ratio Comparison (Higher is Better)</div>
          <div className="text-[10px] text-console-muted mb-3">Delivery percentage in %</div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pdrChartData} margin={{ top: 10, right: 15, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 105]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="Baseline (Best Effort)" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Proposed (QoS VO)" fill="#047857" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-console-card border border-console-border rounded p-4 font-mono">
        <div className="text-xs font-bold text-console-heading uppercase mb-3">
          Quantitative Comparison Summary Table
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-console-panel text-console-muted border-b border-console-border">
              <tr>
                <th className="py-2 px-3">Performance Metric</th>
                <th className="py-2 px-3">Baseline (Best Effort)</th>
                <th className="py-2 px-3">Proposed (Emergency VO)</th>
                <th className="py-2 px-3">Improvement Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-console-border text-console-text">
              <tr>
                <td className="py-2 px-3 font-semibold text-console-heading">Ambulance Mean Delay</td>
                <td className="py-2 px-3">{baseline.avg_delay_ms.toFixed(3)} ms</td>
                <td className="py-2 px-3 text-delivered-text font-bold">{proposed.avg_delay_ms.toFixed(3)} ms</td>
                <td className="py-2 px-3 text-delivered-text font-bold">
                  {compStats.delay_reduction_percent > 0 ? `-${compStats.delay_reduction_percent}% latency` : '0%'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-console-heading">Ambulance Jitter</td>
                <td className="py-2 px-3">{baseline.avg_jitter_ms.toFixed(3)} ms</td>
                <td className="py-2 px-3 font-bold">{proposed.avg_jitter_ms.toFixed(3)} ms</td>
                <td className="py-2 px-3 text-delivered-text font-bold">
                  {compStats.jitter_reduction_percent > 0 ? `-${compStats.jitter_reduction_percent}% jitter` : '0%'}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-console-heading">Ambulance Packet Delivery (PDR)</td>
                <td className="py-2 px-3">{baseline.pdr_percent.toFixed(2)}%</td>
                <td className="py-2 px-3 text-delivered-text font-bold">{proposed.pdr_percent.toFixed(2)}%</td>
                <td className="py-2 px-3 text-delivered-text font-bold">
                  {compStats.pdr_change_percent >= 0 ? `+${compStats.pdr_change_percent}% PDR` : `${compStats.pdr_change_percent}%`}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-console-heading">Ambulance Throughput</td>
                <td className="py-2 px-3">{baseline.throughput_kbps.toFixed(3)} kbps</td>
                <td className="py-2 px-3">{proposed.throughput_kbps.toFixed(3)} kbps</td>
                <td className="py-2 px-3 text-console-muted">
                  {compStats.throughput_change_percent >= 0 ? `+${compStats.throughput_change_percent}%` : `${compStats.throughput_change_percent}%`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
