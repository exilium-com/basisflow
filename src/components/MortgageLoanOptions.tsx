import React from "react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { NumberField, TextField } from "./Field";
import { RowItem } from "./RowItem";
import { SegmentedToggle } from "./SegmentedToggle";
import { usd } from "../lib/format";
import { getMortgageMonthlyPaymentForYear } from "../lib/mortgagePage";
import {
  type Mortgage,
  type MortgageLoanField,
  type MortgageOptionKind,
  type MortgageState,
} from "../lib/mortgageConfig";
import { type MortgageScenario } from "../lib/mortgageSchedule";

type MortgageLoanOptionCardProps = {
  expandedLoanId: string | null;
  mortgage: Mortgage;
  optionId: string;
  optionCount: number;
  currentYear: number;
  onRemoveLoan: (optionId: string) => void;
  onSelectLoan: (optionId: string) => void;
  onSetCompareLoanId: (optionId: string) => void;
  onSetExpandedLoanId: (optionId: string | null) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  onUpdateLoanKind: (optionId: string, kind: MortgageOptionKind) => void;
  scenario: MortgageScenario;
  state: MortgageState;
};

type MortgageLoanOptionListProps = Omit<
  MortgageLoanOptionCardProps,
  "optionId" | "optionCount" | "scenario"
> & {
  optionIds: string[];
  scenariosById: Record<string, MortgageScenario>;
};

type MortgageComparisonRow = {
  label: string;
  left: string;
  right: string;
};

type MortgageComparisonTableProps = {
  compareScenario: MortgageScenario;
  comparisonRows: MortgageComparisonRow[];
  scenario: MortgageScenario;
};

function MortgageLoanOptionCard({
  expandedLoanId,
  mortgage,
  optionId,
  optionCount,
  currentYear,
  onRemoveLoan,
  onSelectLoan,
  onSetCompareLoanId,
  onSetExpandedLoanId,
  onUpdateLoanField,
  onUpdateLoanKind,
  onUpdateLoanName,
  scenario,
  state,
}: MortgageLoanOptionCardProps) {
  const loan = mortgage.options.find((entry) => entry.id === optionId);
  const loanState = state.options.find((entry) => entry.id === optionId);

  if (!loan || !loanState) {
    return null;
  }

  return (
    <RowItem
      selected={state.activeLoanId === optionId}
      onSelect={() => onSelectLoan(optionId)}
      removeLabel={optionCount > 1 ? `Remove ${loanState.name || "mortgage option"}` : undefined}
      onRemove={optionCount > 1 ? () => onRemoveLoan(optionId) : undefined}
      headerClassName="grid gap-3"
      header={
        <div className="grid gap-3">
          <div className="flex items-end gap-3">
            <TextField
              className="min-w-64 flex-1"
              label="Option name"
              value={loanState.name}
              onChange={(event) => onUpdateLoanName(optionId, event.target.value)}
            />
            <div className="pb-2 text-lg font-semibold text-(--ink-soft)">
              {usd(getMortgageMonthlyPaymentForYear(scenario, currentYear))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {loan.kind === "arm" ? (
                <>
                  <NumberField
                    compact
                    label="Initial rate"
                    suffix="%"
                    value={loanState.initialRate}
                    step="0.001"
                    onValueChange={(value) => onUpdateLoanField(optionId, "initialRate", value)}
                  />
                  <NumberField
                    compact
                    label="Loan term"
                    suffix="years"
                    value={loanState.term}
                    step="1"
                    onValueChange={(value) => onUpdateLoanField(optionId, "term", value)}
                  />
                </>
              ) : (
                <>
                  <NumberField
                    compact
                    label="Interest rate"
                    suffix="%"
                    value={loanState.rate}
                    step="0.001"
                    onValueChange={(value) => onUpdateLoanField(optionId, "rate", value)}
                  />
                  <NumberField
                    compact
                    label="Loan term"
                    suffix="years"
                    value={loanState.term}
                    step="1"
                    onValueChange={(value) => onUpdateLoanField(optionId, "term", value)}
                  />
                </>
              )}
            </div>
            <button
              className={
                state.activeLoanId === optionId
                  ? "h-10 min-w-24 shrink-0 border border-(--line-soft) bg-(--white) px-4 text-sm text-(--ink-soft) opacity-50"
                  : state.compareLoanId === optionId
                    ? "h-10 min-w-24 shrink-0 border border-(--teal) bg-(--teal-tint) px-4 text-sm text-(--teal)"
                    : "h-10 min-w-24 shrink-0 border border-(--line-soft) bg-transparent px-4 text-sm text-(--ink-soft)"
              }
              type="button"
              aria-pressed={state.activeLoanId !== optionId && state.compareLoanId === optionId}
              disabled={state.activeLoanId === optionId}
              onClick={(event) => {
                event.stopPropagation();
                onSetCompareLoanId(optionId);
              }}
              >
                Compare
              </button>
          </div>
        </div>
      }
      detailsTitle="Option details"
      detailsOpen={expandedLoanId === optionId}
      onToggleDetails={(open) => onSetExpandedLoanId(open ? optionId : null)}
      detailsContentClassName="grid gap-3 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <SegmentedToggle
          label="Type"
          ariaLabel={`Loan type for ${loanState.name || "mortgage option"}`}
          className="w-fit"
          value={loanState.kind}
          onChange={(kind) => onUpdateLoanKind(optionId, kind)}
          options={[
            { value: "conventional", label: "Conv" },
            { value: "arm", label: "ARM" },
          ]}
        />
      </div>
      {loan.kind === "arm" ? (
        <>
          <NumberField
            label="Reset rate"
            suffix="%"
            value={loanState.adjustedRate}
            step="0.001"
            onValueChange={(value) => onUpdateLoanField(optionId, "adjustedRate", value)}
          />
          <NumberField
            label="Fixed years"
            suffix="years"
            value={loanState.fixedYears}
            step="1"
            onValueChange={(value) => onUpdateLoanField(optionId, "fixedYears", value)}
          />
        </>
      ) : null}
    </RowItem>
  );
}

export function MortgageLoanOptionList(props: MortgageLoanOptionListProps) {
  return (
    <div className="grid gap-2.5" role="list">
      {props.optionIds.map((optionId) => (
        <MortgageLoanOptionCard
          key={optionId}
          {...props}
          optionId={optionId}
          optionCount={props.optionIds.length}
          scenario={props.scenariosById[optionId]}
        />
      ))}
    </div>
  );
}

export function MortgageComparisonTable({
  compareScenario,
  comparisonRows,
  scenario,
}: MortgageComparisonTableProps) {
  const columns: DataTableColumn<MortgageComparisonRow>[] = [
    {
      key: "label",
      header: "Metric",
      align: "text-left",
      render: (row) => row.label,
    },
    {
      key: "left",
      header: scenario.typeLabel,
      align: "text-right",
      render: (row) => row.left,
    },
    {
      key: "right",
      header: compareScenario.typeLabel,
      align: "text-right",
      render: (row) => row.right,
    },
  ];

  return (
    <article className="border border-(--line-soft) bg-(--white-soft) px-4 pt-4 pb-2">
      <p className="mb-3 text-sm leading-relaxed text-(--ink-soft)">
        {`${scenario.typeLabel} against ${compareScenario.typeLabel}`}
      </p>
      <DataTable columns={columns} rows={comparisonRows} getRowKey={(row) => row.label} className="trim-last-table-row" />
    </article>
  );
}
