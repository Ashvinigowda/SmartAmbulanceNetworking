import React, { useState, useEffect, useRef } from 'react';
import { Simulation, TopologyData, TopologyNode } from '../types';
import { api } from '../services/api';
import { MetricSkeleton } from '../components/SkeletonLoader';

interface TopologyPageProps {
  simulation: Simulation | null;
}

export const TopologyPage: React.FC<TopologyPageProps> = ({ simulation }) => {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!simulation) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getTopology(simulation.id)
      .then((data) => {
        if (isMounted) {
          setTopology(data);
          setLoading(false);
          const firstAmb = data.nodes.find((n) => n.type === 'ambulance');
          if (firstAmb) setSelectedNode(firstAmb);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load topology layout');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [simulation?.id]);

  const handleFitScreen = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="h-12 bg-console-card border border-console-border rounded skeleton-shimmer" />
        <div className="h-[520px] bg-console-card border border-console-border rounded skeleton-shimmer" />
      </div>
    );
  }

  if (error || !topology) {
    return (
      <div className="p-12 text-center text-emergency font-mono text-xs">
        <p>{error || 'Topology data unavailable'}</p>
      </div>
    );
  }

  const { bounds, nodes, links } = topology;
  const viewBoxWidth = 600;
  const viewBoxHeight = 520;

  const scaleX = (x: number) => {
    const range = bounds.max_x - bounds.min_x || 500;
    return 35 + ((x - bounds.min_x) / range) * (viewBoxWidth - 70);
  };

  const scaleY = (y: number) => {
    const range = bounds.max_y - bounds.min_y || 500;
    return 35 + ((y - bounds.min_y) / range) * (viewBoxHeight - 70);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Topology Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-console-panel border border-console-border rounded p-3.5">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs font-bold text-console-heading uppercase">
            <span>2D Vehicular Node Topology</span>
            <span className="text-console-muted">|</span>
            <span className="text-console-muted font-normal">
              Area: {bounds.max_x}m x {bounds.max_y}m | Total Nodes: {topology.node_count} ({topology.ambulance_count} Ambulance, {topology.ordinary_count} Traffic, {topology.hospital_count} Hospital)
            </span>
          </div>
        </div>

        {/* Zoom & Fit Toolbar */}
        <div className="flex items-center space-x-1.5 bg-console-card border border-console-border rounded p-1 self-start font-mono text-xs">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 3.0))}
            className="px-2 py-0.5 hover:bg-console-hover text-console-heading rounded transition"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="px-2 py-0.5 hover:bg-console-hover text-console-heading rounded transition"
            title="Zoom Out"
          >
            -
          </button>
          <span className="text-[10px] text-console-muted px-1.5">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleFitScreen}
            className="px-2 py-0.5 hover:bg-console-hover text-console-muted rounded transition text-[11px]"
            title="Reset View"
          >
            FIT
          </button>
        </div>
      </div>

      {/* Main Canvas & Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 2D Canvas */}
        <div className="lg:col-span-3 bg-console-bg border border-console-border rounded relative overflow-hidden h-[540px]">
          {/* Subtle 50m Grid Lines */}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-crosshair select-none"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Grid axis lines */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Wireless Links */}
              {links.map((link, idx) => {
                const sNode = nodes.find((n) => n.id === link.source);
                const tNode = nodes.find((n) => n.id === link.target);
                if (!sNode || !tNode) return null;

                const x1 = scaleX(sNode.x);
                const y1 = scaleY(sNode.y);
                const x2 = scaleX(tNode.x);
                const y2 = scaleY(tNode.y);

                const isEmergency = sNode.type === 'ambulance';

                return (
                  <line
                    key={`link-${idx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isEmergency ? '#b91c1c' : '#cbd5e1'}
                    strokeWidth={isEmergency ? 1.5 : 0.8}
                    strokeDasharray={isEmergency ? 'none' : '3,3'}
                    strokeOpacity={isEmergency ? 0.9 : 0.7}
                  />
                );
              })}

              {/* Node Elements */}
              {nodes.map((node) => {
                const cx = scaleX(node.x);
                const cy = scaleY(node.y);
                const isSelected = selectedNode?.id === node.id;
                const isAmbulance = node.type === 'ambulance';
                const isHospital = node.type === 'hospital';

                return (
                  <g
                    key={`node-${node.id}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                  >
                    {/* Selection Reticle */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHospital ? 20 : isAmbulance ? 15 : 9}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    )}

                    {/* Node Glyphs */}
                    {isHospital ? (
                      <rect
                        x={cx - 10}
                        y={cy - 10}
                        width="20"
                        height="20"
                        fill="#047857"
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 1}
                        rx="2"
                      />
                    ) : isAmbulance ? (
                      <polygon
                        points={`${cx},${cy - 9} ${cx + 8},${cy + 7} ${cx - 8},${cy + 7}`}
                        fill="#b91c1c"
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 1}
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

                    {/* Node Text Label */}
                    {(isAmbulance || isHospital || isSelected) && (
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
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Coordinate Watermark */}
          <div className="absolute bottom-2 left-2 bg-console-panel border border-console-border rounded px-2.5 py-1 text-[10px] font-mono text-console-muted">
            <span className="text-emergency mr-2 font-bold">▲ Ambulance (VO, TID 6)</span>
            <span className="text-delivered mr-2 font-bold">■ Hospital (Sink)</span>
            <span className="text-traffic font-bold">● Traffic (BE)</span>
          </div>
        </div>

        {/* Node Details Inspector Drawer */}
        <div className="bg-console-card border border-console-border rounded p-4 flex flex-col justify-between">
          <div>
            <div className="pb-2.5 border-b border-console-border mb-3 font-mono text-xs font-bold text-console-heading uppercase">
              Node Inspector
            </div>

            {selectedNode ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-console-panel p-2.5 rounded border border-console-border">
                  <div className="font-bold text-console-heading">{selectedNode.name}</div>
                  <div className="text-[11px] text-console-muted">ID: {selectedNode.id} | Class: {selectedNode.type}</div>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-console-border/60">
                    <span className="text-console-muted">IPv4 Address:</span>
                    <span className="text-console-heading">{selectedNode.ip}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-console-border/60">
                    <span className="text-console-muted">Coordinates:</span>
                    <span className="text-console-heading">X:{selectedNode.x.toFixed(1)}m Y:{selectedNode.y.toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-console-border/60">
                    <span className="text-console-muted">EDCA Queue:</span>
                    <span className={selectedNode.type === 'ambulance' ? 'text-emergency font-bold' : 'text-console-heading'}>
                      {selectedNode.type === 'ambulance' ? 'AC_VO (TID 6, Voice)' : 'AC_BE (TID 0, Best Effort)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-console-border/60">
                    <span className="text-console-muted">Vector Azimuth:</span>
                    <span className="text-console-heading">45.0 deg</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-console-muted">Dynamic Hospital ETA:</span>
                    <span className="text-delivered-text font-bold">18.4 s</span>
                  </div>
                </div>

                {/* Simulated Packet Header Hex Preview */}
                <div className="pt-2 border-t border-console-border space-y-1">
                  <div className="text-[10px] text-console-muted uppercase font-bold">In-Flight Packet Header (Hex)</div>
                  <pre className="p-2 bg-console-panel rounded border border-console-border text-[9px] text-console-muted overflow-x-auto leading-tight">
                    {selectedNode.type === 'ambulance'
                      ? '41 4d 01 02 00 00 00 00 00 00 00 0b 00 01 00 00\n00 0c 8c 12 fb 83 42 12 cc cd 42 91 00 00 41 b3\n00 00 42 34 00 00 00 03 03 01 41 93 33 33 00 07'
                      : '41 4d 01 04 00 00 00 02 00 00 00 0b 00 00 00 00\n00 24 8c 12 fa 00 42 10 00 00 42 80 00 00 41 20'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-console-muted text-xs font-mono">
                Click any node on the topology grid to inspect its network stack.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-console-border text-[10px] text-console-muted font-mono">
            Wi-Fi Standard: IEEE 802.11g Ad-Hoc 20 dBm
          </div>
        </div>
      </div>
    </div>
  );
};
