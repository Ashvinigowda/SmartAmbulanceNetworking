import React, { useState } from 'react';
import { Simulation } from '../types';
import { api } from '../services/api';

interface ReportsPageProps {
  allSimulations: Simulation[];
  selectedSimulation: Simulation | null;
  onSelectSimulation: (sim: Simulation) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  allSimulations,
  selectedSimulation,
  onSelectSimulation,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredSims = allSimulations.filter((sim) => {
    const matchesSearch =
      sim.exp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sim.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sim.config.prop_model.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority =
      priorityFilter === 'all' ||
      (priorityFilter === 'on' && sim.config.priority_enabled) ||
      (priorityFilter === 'off' && !sim.config.priority_enabled);

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-console-panel border border-console-border rounded p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
        <div>
          <div className="font-bold text-console-heading uppercase">
            Simulation Results, Datasets & Report Exports
          </div>
          <p className="text-console-muted mt-0.5">
            Audit master simulation metrics, filter benchmark runs, and download CSV/JSON datasets.
          </p>
        </div>

        {selectedSimulation && (
          <div className="flex items-center space-x-2 self-start">
            <a
              href={api.getExportUrl(selectedSimulation.id, 'csv')}
              download
              className="px-2.5 py-1 bg-console-card hover:bg-console-hover text-console-heading border border-console-border rounded transition"
            >
              Export CSV
            </a>
            <a
              href={api.getExportUrl(selectedSimulation.id, 'json')}
              download
              className="px-2.5 py-1 bg-console-card hover:bg-console-hover text-console-heading border border-console-border rounded transition"
            >
              Export JSON
            </a>
            <a
              href={api.getSummaryReportUrl(selectedSimulation.id)}
              download
              className="px-2.5 py-1 bg-emergency hover:bg-emergency-border text-white rounded transition font-bold"
            >
              Summary Report (.md)
            </a>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-console-card border border-console-border rounded p-3 font-mono text-xs">
        <div className="w-full sm:w-96">
          <input
            type="text"
            placeholder="Search experiment ID, title, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-console-panel border border-console-border text-console-heading rounded px-3 py-1 text-xs focus:outline-none focus:border-console-borderLight"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-console-muted">Filter:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-console-panel border border-console-border text-console-heading rounded px-2.5 py-1 focus:outline-none"
          >
            <option value="all">All Runs ({allSimulations.length})</option>
            <option value="on">Priority ON</option>
            <option value="off">Priority OFF (Baseline)</option>
          </select>
        </div>
      </div>

      {/* Simulation Runs Table */}
      <div className="bg-console-card border border-console-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-console-panel text-console-muted border-b border-console-border">
              <tr>
                <th className="py-2.5 px-3">Run Label</th>
                <th className="py-2.5 px-3">QoS</th>
                <th className="py-2.5 px-3">Amb / Sources</th>
                <th className="py-2.5 px-3">Mobility</th>
                <th className="py-2.5 px-3">Amb PDR</th>
                <th className="py-2.5 px-3">Delay (ms)</th>
                <th className="py-2.5 px-3">Throughput</th>
                <th className="py-2.5 px-3">Alerts Rx</th>
                <th className="py-2.5 px-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-console-border text-console-text">
              {filteredSims.map((sim) => {
                const isSelected = selectedSimulation?.id === sim.id;
                return (
                  <tr
                    key={sim.id}
                    onClick={() => onSelectSimulation(sim)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-console-hover text-console-heading font-semibold' : 'hover:bg-console-panel'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="text-console-heading font-bold">{sim.exp_id}</div>
                      <div className="text-[10px] text-console-muted truncate max-w-xs">{sim.title}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                          sim.config.priority_enabled
                            ? 'bg-emergency-bg text-emergency-text border border-emergency-border'
                            : 'bg-console-panel text-console-muted'
                        }`}
                      >
                        {sim.config.priority_enabled ? 'AC_VO' : 'AC_BE'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {sim.config.ambulances} Amb / {sim.config.ordinary_sources} Src
                    </td>
                    <td className="py-2.5 px-3 text-console-muted">{sim.config.mobility_mode}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold ${
                          sim.ambulance_metrics.pdr_percent >= 90
                            ? 'text-delivered-text'
                            : 'text-congested-text'
                        }`}
                      >
                        {sim.ambulance_metrics.pdr_percent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {sim.ambulance_metrics.avg_delay_ms > 0
                        ? `${sim.ambulance_metrics.avg_delay_ms.toFixed(3)} ms`
                        : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-console-muted">
                      {sim.ambulance_metrics.throughput_kbps.toFixed(2)} kbps
                    </td>
                    <td className="py-2.5 px-3 text-delivered-text font-bold">
                      {sim.app_metrics.alerts_rx}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={api.getExportUrl(sim.id, 'csv')}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="text-console-muted hover:text-console-heading underline text-[11px]"
                      >
                        CSV
                      </a>
                    </td>
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
