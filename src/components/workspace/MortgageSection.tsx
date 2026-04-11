import React from "react";
import { ActionButton } from "../ActionButton";
import { ChartPanel } from "../ChartPanel";
import { NumberField } from "../Field";
import { MetricGrid } from "../MetricGrid";
import { MortgageBalanceChart, MortgageCompositionChart } from "../MortgageCharts";
import { MortgageComparisonTable, MortgageLoanOptionList } from "../MortgageLoanOptions";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import {
  getMortgageMonthlyPaymentForYear,
  type MortgageComparisonRow,
} from "../../lib/mortgagePage";
import {
  type Mortgage,
  type MortgageDownPaymentMode,
  type MortgageLoanField,
  type MortgageOptionKind,
  type MortgageState,
} from "../../lib/mortgageConfig";
import { type MortgageScenario } from "../../lib/mortgageSchedule";

type MetricItem = { label: string; value: string };

type MortgageSectionProps = {
  compareScenario: MortgageScenario;
  currentYear: number;
  expandedLoanId: string | null;
  mortgage: Mortgage;
  mortgageComparisonRows: MortgageComparisonRow[];
  mortgageScenario: MortgageScenario;
  mortgageState: MortgageState;
  mortgageSummaryItems: MetricItem[];
  onAddMortgageOption: () => void;
  onHandleDownPaymentMode: (mode: MortgageDownPaymentMode) => void;
  onRemoveLoan: (optionId: string) => void;
  onSelectLoan: (optionId: string) => void;
  onSetCompareLoanId: (optionId: string) => void;
  onSetExpandedLoanId: (optionId: string | null) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateLoanKind: (optionId: string, kind: MortgageOptionKind) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  onUpdateMortgageState: (patch: Partial<MortgageState>) => void;
  scenariosById: Record<string, MortgageScenario>;
};

export function MortgageSection({
  compareScenario,
  currentYear,
  expandedLoanId,
  mortgage,
  mortgageComparisonRows,
  mortgageScenario,
  mortgageState,
  mortgageSummaryItems,
  onAddMortgageOption,
  onHandleDownPaymentMode,
  onRemoveLoan,
  onSelectLoan,
  onSetCompareLoanId,
  onSetExpandedLoanId,
  onUpdateLoanField,
  onUpdateLoanKind,
  onUpdateLoanName,
  onUpdateMortgageState,
  scenariosById,
}: MortgageSectionProps) {
  return (
    <WorkspaceSection
      id="mortgage"
      index="02"
      title="Home & Mortgage"
      summary="Housing Cost"
      actions={<ActionButton onClick={onAddMortgageOption}>Add mortgage option</ActionButton>}
    >
      <div className="split-main-sidebar">
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              label="Home price"
              prefix="$"
              value={mortgageState.homePrice}
              step="50000"
              onValueChange={(value) => onUpdateMortgageState({ homePrice: value ?? 0 })}
            />

            <div className="flex items-end gap-2">
              <SegmentedToggle
                label="Down payment"
                ariaLabel="Down payment mode"
                className="shrink-0"
                value={mortgageState.downPaymentMode}
                onChange={onHandleDownPaymentMode}
                options={[
                  { value: "dollar", label: "$" },
                  { value: "percent", label: "%" },
                ]}
              />
              <NumberField
                className="min-w-0 flex-1"
                label={null}
                value={mortgageState.downPayment}
                step={mortgageState.downPaymentMode === "dollar" ? "1" : "0.001"}
                onValueChange={(value) => onUpdateMortgageState({ downPayment: value ?? 0 })}
              />
            </div>
            <NumberField
              label="Home insurance"
              prefix="$"
              suffix="/ year"
              value={mortgageState.insurancePerYear}
              step="1"
              onValueChange={(value) => onUpdateMortgageState({ insurancePerYear: value ?? 0 })}
            />
            <NumberField
              label="HOA"
              prefix="$"
              suffix="/ month"
              value={mortgageState.hoaPerMonth}
              step="1"
              onValueChange={(value) => onUpdateMortgageState({ hoaPerMonth: value ?? 0 })}
            />
          </div>

          <MortgageLoanOptionList
            expandedLoanId={expandedLoanId}
            currentYear={currentYear}
            mortgage={mortgage}
            optionIds={mortgageState.options.map((option) => option.id)}
            scenariosById={scenariosById}
            state={mortgageState}
            onSelectLoan={onSelectLoan}
            onSetCompareLoanId={onSetCompareLoanId}
            onSetExpandedLoanId={onSetExpandedLoanId}
            onUpdateLoanField={onUpdateLoanField}
            onUpdateLoanName={onUpdateLoanName}
            onUpdateLoanKind={onUpdateLoanKind}
            onRemoveLoan={onRemoveLoan}
          />
        </div>

        <div>
          <MetricGrid
            primaryItem={{
              label: "Estimated monthly payment",
              value: usd(getMortgageMonthlyPaymentForYear(mortgageScenario, currentYear)),
            }}
            items={mortgageSummaryItems}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        <ChartPanel title="Balance Over Time" legend={[{ label: "Remaining balance", color: "#0c6a7c" }]}>
          <MortgageBalanceChart scenario={mortgageScenario} />
        </ChartPanel>

        <ChartPanel
          title="Principal vs Interest"
          legend={[
            { label: "Principal", color: "#0c6a7c" },
            { label: "Interest", color: "#d28a47" },
          ]}
        >
          <MortgageCompositionChart scenario={mortgageScenario} />
        </ChartPanel>
      </div>

      {mortgageState.activeLoanId !== mortgageState.compareLoanId ? (
        <div className="mt-8">
          <MortgageComparisonTable
            compareScenario={compareScenario}
            comparisonRows={mortgageComparisonRows}
            scenario={mortgageScenario}
          />
        </div>
      ) : null}
    </WorkspaceSection>
  );
}
