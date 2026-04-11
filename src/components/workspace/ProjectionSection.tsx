import React from "react";
import { ChartPanel } from "../ChartPanel";
import { MonthlyCashFlowPanel } from "../ProjectionCashFlowPanel";
import { NetWorthChart } from "../ProjectionLineCharts";
import { WorkspaceSection } from "./WorkspaceSection";
import { type Projection } from "../../lib/projectionState";
import { type ProjectionResults } from "../../lib/projectionCalculation";
import { type MonthlyCashFlow } from "../../lib/projectionUtils";

type ProjectionSectionProps = {
  monthlyCashFlow: MonthlyCashFlow;
  projection: Projection;
  projectionResults: ProjectionResults;
};

export function ProjectionSection({
  monthlyCashFlow,
  projection,
  projectionResults,
}: ProjectionSectionProps) {
  return (
    <WorkspaceSection id="projection" index="06" title="Projection" summary="Long View">
      <div className="grid gap-8">
        <ChartPanel
          title={
            projection.currentYear === 0
              ? "Monthly Cash Flow Today"
              : `Monthly Cash Flow in Year ${projection.currentYear}`
          }
        >
          <MonthlyCashFlowPanel
            items={monthlyCashFlow.items}
            netFlow={monthlyCashFlow.netFlow}
            total={monthlyCashFlow.total}
          />
        </ChartPanel>

        <ChartPanel
          title="Net Worth Curve"
          legend={[
            { label: "Net worth", color: "#0a4a53" },
            { label: "Assets", color: "#0d6a73" },
            { label: "Home equity", color: "#c56b3d" },
            { label: "Reserve cash", color: "#566773" },
          ]}
        >
          <NetWorthChart
            projection={projection}
            results={projectionResults}
            currentYear={projection.currentYear}
          />
        </ChartPanel>
      </div>
    </WorkspaceSection>
  );
}
