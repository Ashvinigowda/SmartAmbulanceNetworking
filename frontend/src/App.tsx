import React, { useState, useEffect } from 'react';
import { Simulation, SystemHealth } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { TopologyPage } from './pages/TopologyPage';
import { ReplayPage } from './pages/ReplayPage';
import { CongestionPage } from './pages/CongestionPage';
import { PriorityPage } from './pages/PriorityPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { RunnerPage } from './pages/RunnerPage';
import { ReportsPage } from './pages/ReportsPage';
import { TermsOfServiceModal, PrivacyPolicyModal } from './components/LegalModals';
import { TableSkeleton } from './components/SkeletonLoader';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Legal modals state (Rules 26 & 27: TOS & Privacy Policy)
  const [isTosOpen, setIsTosOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthData, simData] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getSimulations(),
      ]);

      setHealth(healthData);
      setSimulations(simData.simulations);

      if (simData.simulations.length > 0) {
        const defaultSim =
          simData.simulations.find((s) => s.exp_id === 'EXP2_SOURCES_50') ||
          simData.simulations[0];
        setSelectedSimulation(defaultSim);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to NS-3 analytics backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      api.getHealth().then(setHealth).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-console-bg text-console-text flex flex-col font-sans">
      {/* Top Console Bar */}
      <Navbar
        simulations={simulations}
        selectedSimulation={selectedSimulation}
        onSelectSimulation={setSelectedSimulation}
        health={health}
      />

      {/* Main Grid: Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onSelectPage={setCurrentPage}
          onOpenTos={() => setIsTosOpen(true)}
          onOpenPrivacy={() => setIsPrivacyOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-console-bg">
          {loading ? (
            <div className="p-8 max-w-7xl mx-auto space-y-4">
              <div className="h-10 bg-console-card border border-console-border rounded skeleton-shimmer" />
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-console-card border border-console-border rounded skeleton-shimmer" />
                ))}
              </div>
              <TableSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8 space-y-3 font-mono">
              <div className="p-3 bg-emergency-bg border border-emergency-border text-emergency-text rounded text-xs">
                SYSTEM ERROR: Simulation Backend Unreachable
              </div>
              <p className="text-xs text-console-muted max-w-md">{error}</p>
              <button
                onClick={loadData}
                className="px-3 py-1.5 bg-console-card hover:bg-console-hover text-console-heading border border-console-border rounded text-xs transition"
              >
                Reconnect Console
              </button>
            </div>
          ) : (
            <>
              {currentPage === 'overview' && (
                <OverviewPage
                  simulation={selectedSimulation}
                  allSimulations={simulations}
                  onSelectSimulation={setSelectedSimulation}
                  onNavigate={setCurrentPage}
                />
              )}
              {currentPage === 'topology' && (
                <TopologyPage simulation={selectedSimulation} />
              )}
              {currentPage === 'replay' && (
                <ReplayPage simulation={selectedSimulation} />
              )}
              {currentPage === 'congestion' && (
                <CongestionPage
                  simulation={selectedSimulation}
                  allSimulations={simulations}
                />
              )}
              {currentPage === 'priority' && (
                <PriorityPage simulation={selectedSimulation} />
              )}
              {currentPage === 'comparison' && (
                <ComparisonPage allSimulations={simulations} />
              )}
              {currentPage === 'runner' && (
                <RunnerPage onRefreshSimulations={loadData} onNavigate={setCurrentPage} />
              )}
              {currentPage === 'reports' && (
                <ReportsPage
                  allSimulations={simulations}
                  selectedSimulation={selectedSimulation}
                  onSelectSimulation={setSelectedSimulation}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Compliance Modals */}
      <TermsOfServiceModal isOpen={isTosOpen} onClose={() => setIsTosOpen(false)} />
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};
