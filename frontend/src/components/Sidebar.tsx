import React from 'react';

export type PageId =
  | 'overview'
  | 'topology'
  | 'replay'
  | 'congestion'
  | 'priority'
  | 'comparison'
  | 'runner'
  | 'reports';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onOpenTos: () => void;
  onOpenPrivacy: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  onOpenTos,
  onOpenPrivacy,
}) => {
  const navItems: { id: PageId; code: string; label: string; badge?: string }[] = [
    { id: 'overview', code: '01', label: 'System Overview' },
    { id: 'topology', code: '02', label: '2D Node Topology', badge: 'Interactive' },
    { id: 'replay', code: '03', label: 'Packet Flow Replay', badge: 'Trace Stream' },
    { id: 'congestion', code: '04', label: 'Congestion Metrics' },
    { id: 'priority', code: '05', label: 'IEEE 802.11e EDCA' },
    { id: 'comparison', code: '06', label: 'Scenario Comparison' },
    { id: 'runner', code: '07', label: 'Simulation Controller' },
    { id: 'reports', code: '08', label: 'Datasets & Export' },
  ];

  return (
    <aside className="w-60 bg-console-panel border-r border-console-border flex flex-col justify-between select-none">
      <div className="p-3 space-y-1">
        <div className="px-2 py-1.5 text-[10px] font-mono font-bold text-console-muted uppercase tracking-wider">
          Console Navigation
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs font-mono transition-colors ${
                  active
                    ? 'bg-console-card text-console-heading font-semibold border border-console-borderLight'
                    : 'text-console-muted hover:text-console-text hover:bg-console-hover'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className={`text-[10px] ${active ? 'text-emergency font-bold' : 'text-console-border'}`}>
                    {item.code}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      active ? 'bg-emergency-bg text-emergency-text border border-emergency-border' : 'bg-console-bg text-console-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Protocol Architecture & Compliance Footer (TOS + Privacy Policy) */}
      <div className="p-3 m-2 rounded bg-console-card border border-console-border text-[11px] font-mono text-console-muted space-y-2">
        <div className="flex justify-between items-center text-[10px] text-console-heading pb-1 border-b border-console-border">
          <span>MAC: 802.11g Ad-Hoc</span>
          <span className="text-emergency">AC_VO: TID 6</span>
        </div>
        <div className="text-[10px] space-y-1">
          <div className="flex justify-between">
            <span>Contention CW:</span>
            <span className="text-console-heading">3 - 7 (Voice)</span>
          </div>
          <div className="flex justify-between">
            <span>Best Effort CW:</span>
            <span className="text-console-heading">15 - 1023</span>
          </div>
          <div className="flex justify-between">
            <span>Packet Header:</span>
            <span className="text-console-heading">54 Bytes</span>
          </div>
        </div>

        {/* TOS & Privacy Policy Links */}
        <div className="pt-2 border-t border-console-border flex justify-between text-[10px]">
          <button
            onClick={onOpenTos}
            className="text-console-muted hover:text-console-heading underline decoration-dotted"
          >
            Terms of Use
          </button>
          <span className="text-console-border">|</span>
          <button
            onClick={onOpenPrivacy}
            className="text-console-muted hover:text-console-heading underline decoration-dotted"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </aside>
  );
};
