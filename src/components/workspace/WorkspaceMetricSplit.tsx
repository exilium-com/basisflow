import React from "react";
import clsx from "clsx";
import { MetricGrid, type MetricGridProps } from "../MetricGrid";

type WorkspaceMetricSplitProps = {
  metrics: MetricGridProps;
  mainClassName?: string;
  metricsClassName?: string;
  children: React.ReactNode;
};

export function WorkspaceMetricSplit({
  metrics,
  mainClassName = "",
  metricsClassName = "",
  children,
}: WorkspaceMetricSplitProps) {
  return (
    <div className="grid grid-cols-5 gap-4">
      <div className={clsx("col-span-3", mainClassName)}>{children}</div>
      <div className={clsx("col-span-2 h-full", metricsClassName)}>
        <div className="sticky top-4">
          <MetricGrid {...metrics} />
        </div>
      </div>
    </div>
  );
}
