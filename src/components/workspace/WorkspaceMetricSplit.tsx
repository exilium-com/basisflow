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
    <div className="grid gap-4 lg:grid-cols-5">
      <div className={clsx("order-2 lg:order-1 lg:col-span-3", mainClassName)}>{children}</div>
      <div className={clsx("order-1 lg:order-2 lg:col-span-2", metricsClassName)}>
        <div className="lg:sticky lg:top-4">
          <MetricGrid {...metrics} />
        </div>
      </div>
    </div>
  );
}
