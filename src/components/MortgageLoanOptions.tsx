import React from "react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { NumberField } from "./Field";
import { RowItem } from "./RowItem";
import { usd } from "../lib/format";
import {
  getMortgageLoanMeta,
  LOAN_OPTIONS,
  type LoanOption,
  type LoanType,
  type Mortgage,
  type MortgageLoanField,
  type MortgageState,
} from "../lib/mortgageConfig";
import { type MortgageScenario } from "../lib/mortgageSchedule";

type MortgageLoanOptionCardProps = {
  expandedLoanType: LoanType | null;
  mortgage: Mortgage;
  loanType: LoanType;
  onSelectLoan: (loanType: LoanType) => void;
  onSetCompareLoanType: (loanType: LoanType) => void;
  onSetExpandedLoanType: (loanType: LoanType | null) => void;
  onUpdateLoanField: (loanType: LoanType, field: MortgageLoanField, value: number | null) => void;
  option: LoanOption;
  scenario: MortgageScenario;
  state: MortgageState;
};

type MortgageLoanOptionListProps = Omit<MortgageLoanOptionCardProps, "loanType" | "option" | "scenario"> & {
  scenariosByType: Record<LoanType, MortgageScenario>;
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
  expandedLoanType,
  mortgage,
  loanType,
  onSelectLoan,
  onSetCompareLoanType,
  onSetExpandedLoanType,
  onUpdateLoanField,
  option,
  scenario,
  state,
}: MortgageLoanOptionCardProps) {
  const loan = mortgage.loanOptions[loanType];
  const loanState = state.loanOptions[loanType];

  return (
    <RowItem
      selected={state.activeLoanType === loanType}
      onSelect={() => onSelectLoan(loanType)}
      headerClassName="grid items-center gap-2"
      header={
        <>
          <div className="text-base font-bold text-(--ink)">{option.label}</div>
          <div className="text-sm text-(--ink-soft)">{usd(scenario.totalMonthlyPayment)}</div>
        </>
      }
      action={
        <button
          className={
            state.activeLoanType === loanType
              ? "h-10 min-w-24 border border-(--line-soft) bg-(--white) px-4 text-sm text-(--ink-soft) opacity-50"
              : state.compareLoanType === loanType
                ? "h-10 min-w-24 border border-(--teal) bg-(--teal-tint) px-4 text-sm text-(--teal)"
                : "h-10 min-w-24 border border-(--line-soft) bg-transparent px-4 text-sm text-(--ink-soft)"
          }
          type="button"
          aria-pressed={state.activeLoanType !== loanType && state.compareLoanType === loanType}
          disabled={state.activeLoanType === loanType}
          onClick={() => onSetCompareLoanType(loanType)}
        >
          Compare
        </button>
      }
      detailsTitle="Rate details"
      detailsSummary={getMortgageLoanMeta(loan)}
      detailsOpen={expandedLoanType === loanType}
      onToggleDetails={(open) => onSetExpandedLoanType(open ? loanType : null)}
      detailsContentClassName="grid gap-3 sm:grid-cols-3"
    >
      {option.kind === "fixed" ? (
        <>
          <NumberField
            label="Interest rate"
            suffix="%"
            value={loanState.rate}
            step="0.001"
            onValueChange={(value) => onUpdateLoanField(loanType, "rate", value)}
          />
          <NumberField
            label="Loan term"
            suffix="years"
            value={loanState.term}
            step="1"
            onValueChange={(value) => onUpdateLoanField(loanType, "term", value)}
          />
        </>
      ) : (
        <>
          <NumberField
            label="Initial rate"
            suffix="%"
            value={loanState.initialRate}
            step="0.001"
            onValueChange={(value) => onUpdateLoanField(loanType, "initialRate", value)}
          />
          <NumberField
            label="Reset rate"
            suffix="%"
            value={loanState.adjustedRate}
            placeholder={loan.kind === "arm" ? String(loan.initialRate) : undefined}
            step="0.001"
            onValueChange={(value) => onUpdateLoanField(loanType, "adjustedRate", value)}
          />
          <NumberField
            label="Loan term"
            suffix="years"
            value={loanState.term}
            step="1"
            onValueChange={(value) => onUpdateLoanField(loanType, "term", value)}
          />
        </>
      )}
    </RowItem>
  );
}

export function MortgageLoanOptionList(props: MortgageLoanOptionListProps) {
  return (
    <div className="grid gap-2.5" role="list">
      {LOAN_OPTIONS.map((option) => (
        <MortgageLoanOptionCard
          key={option.type}
          {...props}
          loanType={option.type}
          option={option}
          scenario={props.scenariosByType[option.type]}
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
      <DataTable columns={columns} rows={comparisonRows} getRowKey={(row) => row.label} />
    </article>
  );
}
