import React from "react";
import { MetricGrid, type MetricGridProps } from "../MetricGrid";

type WorkspaceMetricSplitProps = {
  metrics: MetricGridProps;
  children: React.ReactNode;
};

export function WorkspaceMetricSplit({ metrics, children }: WorkspaceMetricSplitProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="order-2 grid gap-4 self-start lg:order-1 lg:col-span-3">{children}</div>
      <div className="order-1 lg:order-2 lg:col-span-2">
        <div className="lg:sticky lg:top-20">
          <MetricGrid {...metrics} />
        </div>
      </div>
    </div>
  );
}
