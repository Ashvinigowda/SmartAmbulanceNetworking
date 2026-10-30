import React from 'react';
import { Simulation, SystemHealth } from '../types';

interface NavbarProps {
  simulations: Simulation[];
  selectedSimulation: Simulation | null;
  onSelectSimulation: (sim: Simulation) => void;
  health: SystemHealth | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  simulations,
  selectedSimulation,
  onSelectSimulation,
  health,
}) => {
  return (
    <header className="h-13 bg-console-panel border-b border-console-border px-5 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Brand & Systems Identifier */}
      <div className="flex items-center space-x-3">
        <div className="w-7 h-7 rounded bg-emergency-bg border border-emergency-border flex items-center justify-center font-mono font-bold text-xs text-emergency">
          NS3
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-mono font-bold text-xs text-console-heading tracking-wider uppercase">
              Smart Ambulance Network Console
            </h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-console-card border border-console-border text-console-muted font-mono">
              v3.45-EDCA
            </span>
          </div>
          <p className="text-[11px] text-console-muted font-mono">
            IEEE 802.11e Priority QoS under Vehicular Congestion
          </p>
        </div>
      </div>

      {/* Control Strip & Telemetry */}
      <div className="flex items-center space-x-3">
        {/* Active Simulation Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-[11px] text-console-muted font-mono uppercase">Scenario:</label>
          <select
            value={selectedSimulation?.id || ''}
            onChange={(e) => {
              const found = simulations.find((s) => s.id === e.target.value);
              if (found) onSelectSimulation(found);
            }}
            className="bg-console-card border border-console-border text-console-heading text-xs rounded px-2.5 py-1 focus:outline-none focus:border-console-borderLight max-w-xs truncate font-mono"
          >
            {simulations.map((sim) => (
              <option key={sim.id} value={sim.id}>
                {sim.exp_id} ({sim.config.ambulances} Amb, {sim.config.ordinary_sources} Src,{' '}
                {sim.config.priority_enabled ? 'QoS ON' : 'QoS OFF'})
              </option>
            ))}
          </select>
        </div>

        {/* System Health Strip */}
        <div className="flex items-center space-x-2 bg-console-card border border-console-border rounded px-2.5 py-1 text-[11px] font-mono">
          <span className="w-2 h-2 rounded-none bg-delivered inline-block" />
          <span className="text-delivered-text font-semibold">ONLINE</span>
          <span className="text-console-border">/</span>
          <span className="text-console-muted">
            {health ? `${health.system.memory_percent_used}% MEM` : 'PORT 5000'}
          </span>
        </div>
      </div>
    </header>
  );
};
