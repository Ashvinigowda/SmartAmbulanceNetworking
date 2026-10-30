import React, { useState, useEffect, useRef } from 'react';
import { Simulation, ReplayData, ReplayEvent } from '../types';
import { api } from '../services/api';

interface ReplayPageProps {
  simulation: Simulation | null;
}

export const ReplayPage: React.FC<ReplayPageProps> = ({ simulation }) => {
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const requestRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!simulation) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0.0);

    api
      .getEvents(simulation.id, 1500, 0)
      .then((data) => {
        if (isMounted) {
          setReplayData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load packet replay data');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [simulation?.id]);

  useEffect(() => {
    if (!isPlaying || !replayData) {
      lastWallTimeRef.current = null;
      return;
    }

    const duration = replayData.duration || 15.0;

    const animate = (wallTime: number) => {
      if (lastWallTimeRef.current !== null) {
        const deltaWallSec = (wallTime - lastWallTimeRef.current) / 1000.0;
        setCurrentTime((prev) => {
          const next = prev + deltaWallSec * playbackSpeed;
          if (next >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
      }
      lastWallTimeRef.current = wallTime;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackSpeed, replayData]);

  const handlePlayPause = () => {
    if (currentTime >= (replayData?.duration || 15.0)) {
      setCurrentTime(0.0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0.0);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="h-12 bg-console-card border border-console-border rounded skeleton-shimmer" />
        <div className="h-[520px] bg-console-card border border-console-border rounded skeleton-shimmer" />
      </div>
    );
  }

  if (error || !replayData) {
    return (
      <div className="p-12 text-center text-emergency font-mono text-xs">
        <p>{error || 'Replay data unavailable'}</p>
      </div>
    );
  }

  const { duration, nodes, trajectories, events } = replayData;

  const activeEvents = events.filter(
    (e) => currentTime >= e.time && currentTime - e.time <= 0.35
  );

  const pastEvents = events.filter((e) => e.time <= currentTime).slice(-25).reverse();

  const getNodePosition = (nodeId: number, initialX: number, initialY: number) => {
    const traj = trajectories[String(nodeId)];
    if (!traj || traj.length === 0) return { x: initialX, y: initialY };

    let prev = traj[0];
    for (let i = 0; i < traj.length; i++) {
      if (traj[i].t <= currentTime) {
        prev = traj[i];
      } else {
        const next = traj[i];
        const dt = next.t - prev.t;
        if (dt <= 0) return { x: prev.x, y: prev.y };
        const factor = (currentTime - prev.t) / dt;
        return {
          x: prev.x + (next.x - prev.x) * factor,
          y: prev.y + (next.y - prev.y) * factor,
        };
      }
    }
    return { x: prev.x, y: prev.y };
  };

  const viewBoxWidth = 600;
  const viewBoxHeight = 520;
  const scaleCoord = (v: number) => 35 + (v / 500) * (viewBoxWidth - 70);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Replay Status Bar */}
      <div className="bg-console-panel border border-console-border rounded p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="font-mono text-xs">
          <div className="flex items-center space-x-2 font-bold text-console-heading uppercase">
            <span>Discrete Event Packet Replay</span>
            <span className="text-console-muted">|</span>
            <span className="text-console-muted font-normal">
              NS-3 XML Trace Stream | Events: {replayData.total_events} | Duration: {duration.toFixed(2)}s
            </span>
          </div>
        </div>

        {/* Master Simulation Clock */}
        <div className="flex items-center space-x-3 bg-console-card border border-console-border rounded px-3 py-1 font-mono text-xs self-start">
          <span className="text-console-muted uppercase">T_SIM:</span>
          <span className="text-console-heading font-bold text-sm">{currentTime.toFixed(3)}s</span>
          <span className="text-console-border">/</span>
          <span className="text-console-muted">{duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Main Canvas + Wireshark-Style Live Packet Dissection Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* SVG Replay Viewport */}
        <div className="lg:col-span-3 bg-console-bg border border-console-border rounded relative overflow-hidden h-[520px]">
          <svg className="w-full h-full select-none" viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}>
            {/* Grid */}
            <defs>
              <pattern id="replay-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#replay-grid)" />

            {/* Flying Packets */}
            {activeEvents.map((evt) => {
              const sNode = nodes.find((n) => n.id === evt.from_node_id);
              const tNode = nodes.find((n) => n.id === evt.to_node_id);
              if (!sNode || !tNode) return null;

              const sPos = getNodePosition(sNode.id, sNode.x, sNode.y);
              const tPos = getNodePosition(tNode.id, tNode.x, tNode.y);

              const x1 = scaleCoord(sPos.x);
              const y1 = scaleCoord(sPos.y);
              const x2 = scaleCoord(tPos.x);
              const y2 = scaleCoord(tPos.y);

              const progress = Math.min((currentTime - evt.time) / 0.35, 1.0);
              const pktX = x1 + (x2 - x1) * progress;
              const pktY = y1 + (y2 - y1) * progress;

              const isEmergency = evt.msg_type.includes('EMERGENCY') || evt.msg_type.includes('AMBULANCE');

              return (
                <g key={evt.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isEmergency ? '#b91c1c' : '#cbd5e1'}
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                  />
                  <circle
                    cx={pktX}
                    cy={pktY}
                    r={isEmergency ? 4.5 : 3}
                    fill={isEmergency ? '#b91c1c' : '#1d4ed8'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const pos = getNodePosition(node.id, node.x, node.y);
              const cx = scaleCoord(pos.x);
              const cy = scaleCoord(pos.y);

              const isAmbulance = node.type === 'ambulance';
              const isHospital = node.type === 'hospital';

              return (
                <g key={`replay-node-${node.id}`}>
                  {isHospital ? (
                    <rect
                      x={cx - 10}
                      y={cy - 10}
                      width="20"
                      height="20"
                      fill="#047857"
                      stroke="#ffffff"
                      strokeWidth="1"
                      rx="2"
                    />
                  ) : isAmbulance ? (
                    <polygon
                      points={`${cx},${cy - 9} ${cx + 8},${cy + 7} ${cx - 8},${cy + 7}`}
                      fill="#b91c1c"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  ) : (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3.5"
                      fill="#1d4ed8"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  )}

                  <text
                    x={cx}
                    y={cy - (isHospital ? 14 : 11)}
                    textAnchor="middle"
                    fill={isAmbulance ? '#991b1b' : isHospital ? '#065f46' : '#1e40af'}
                    fontSize="9"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Click to Play Overlay when at beginning */}
          {!isPlaying && currentTime === 0 && (
            <div
              onClick={handlePlayPause}
              className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer select-none"
            >
              <div className="px-5 py-2.5 rounded bg-emergency text-white font-mono font-bold text-xs uppercase tracking-wider hover:bg-emergency-border transition">
                Start Packet Flow Replay
              </div>
              <p className="text-[11px] text-console-muted font-mono mt-2">
                Decodes NS-3 wireless transmissions and mobile trajectories without NetAnim
              </p>
            </div>
          )}

          {/* Watermark Status */}
          <div className="absolute top-2 right-2 bg-console-panel border border-console-border rounded px-2 py-0.5 text-[10px] font-mono text-console-muted">
            STATUS: {isPlaying ? <span className="text-emergency font-bold">STREAMING</span> : 'PAUSED'}
          </div>
        </div>

        {/* Live Packet Log (Wireshark-Style Tabular Stream) */}
        <div className="bg-console-card border border-console-border rounded p-3.5 flex flex-col justify-between">
          <div>
            <div className="pb-2 border-b border-console-border mb-2.5 flex justify-between items-center font-mono text-xs font-bold text-console-heading uppercase">
              <span>Packet Capture Stream</span>
              <span className="text-[10px] text-console-muted font-normal">Port 9000</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[420px] font-mono text-[10px]">
              {pastEvents.length === 0 ? (
                <p className="text-console-muted py-8 text-center">
                  Press Play to start packet trace dissection...
                </p>
              ) : (
                pastEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-1.5 rounded bg-console-panel border border-console-border space-y-0.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-console-muted">t={evt.time.toFixed(3)}s</span>
                      <span
                        className={`px-1 rounded text-[9px] font-bold ${
                          evt.msg_type.includes('EMERGENCY')
                            ? 'bg-emergency-bg text-emergency-text'
                            : 'bg-traffic-bg text-traffic-text'
                        }`}
                      >
                        {evt.msg_type.replace('_TELEMETRY', '').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between text-console-heading text-[10px]">
                      <span className="truncate">{evt.from_name} &gt; {evt.to_name}</span>
                      <span className="text-delivered-text font-bold">{evt.latency_ms.toFixed(2)}ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-console-border text-[9px] text-console-muted font-mono">
            NS-3 FlowClassifier: 10.1.0.0/16
          </div>
        </div>
      </div>

      {/* Control Console */}
      <div className="bg-console-panel border border-console-border rounded p-3.5 space-y-3 font-mono text-xs">
        {/* Scrubber */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-console-muted">
            <span>0.000s (Start)</span>
            <span className="text-console-heading font-bold">{currentTime.toFixed(3)}s</span>
            <span>{duration.toFixed(3)}s (Stop)</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.05}
            value={currentTime}
            onChange={(e) => {
              setCurrentTime(parseFloat(e.target.value));
              if (isPlaying) setIsPlaying(false);
            }}
            className="w-full h-1.5 bg-console-card rounded appearance-none cursor-pointer accent-emergency"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayPause}
              className={`px-4 py-1.5 rounded text-xs font-bold font-mono transition ${
                isPlaying
                  ? 'bg-congested text-white'
                  : 'bg-emergency text-white hover:bg-emergency-border'
              }`}
            >
              {isPlaying ? 'PAUSE' : 'PLAY REPLAY'}
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-console-card hover:bg-console-hover text-console-muted rounded border border-console-border text-xs transition"
            >
              RESET
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-console-muted text-[11px]">RATE:</span>
            {[0.5, 1.0, 2.0, 5.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  playbackSpeed === spd
                    ? 'bg-console-card text-console-heading font-bold border border-console-borderLight'
                    : 'text-console-muted hover:text-console-heading'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
