import React from 'react';

export const MetricSkeleton: React.FC = () => (
  <div className="bg-console-card border border-console-border p-4 rounded space-y-2">
    <div className="h-3 w-24 skeleton-shimmer rounded" />
    <div className="h-8 w-32 skeleton-shimmer rounded" />
    <div className="h-3 w-40 skeleton-shimmer rounded" />
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-console-card border border-console-border p-5 rounded space-y-4">
    <div className="flex justify-between">
      <div className="h-4 w-48 skeleton-shimmer rounded" />
      <div className="h-4 w-16 skeleton-shimmer rounded" />
    </div>
    <div className="h-64 w-full skeleton-shimmer rounded" />
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="bg-console-card border border-console-border rounded overflow-hidden">
    <div className="h-10 bg-console-panel border-b border-console-border px-4 py-2" />
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-8 w-full skeleton-shimmer rounded" />
      ))}
    </div>
  </div>
);
