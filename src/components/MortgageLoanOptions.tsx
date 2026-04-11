import React from "react";
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
  onSetExpandedLoanId: (optionId: string | null) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  onUpdateLoanKind: (optionId: string, kind: MortgageOptionKind) => void;
  scenario: MortgageScenario;
  state: MortgageState;
};

type MortgageLoanOptionListProps = Omit<MortgageLoanOptionCardProps, "optionId" | "optionCount" | "scenario"> & {
  optionIds: string[];
  scenariosById: Record<string, MortgageScenario>;
};

function ConventionalLoanHeaderFields({
  optionId,
  loanState,
  onUpdateLoanField,
}: {
  optionId: string;
  loanState: MortgageState["options"][number];
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
}) {
  return (
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
  );
}

function ArmLoanHeaderFields({
  optionId,
  loanState,
  onUpdateLoanField,
}: {
  optionId: string;
  loanState: MortgageState["options"][number];
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
}) {
  return (
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
  );
}

function ArmLoanDetails({
  optionId,
  loanState,
  onUpdateLoanField,
}: {
  optionId: string;
  loanState: MortgageState["options"][number];
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
}) {
  return (
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
  );
}

function RentDetails({
  optionId,
  loanState,
  onUpdateLoanField,
}: {
  optionId: string;
  loanState: MortgageState["options"][number];
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
}) {
  return (
    <NumberField
      label="Growth"
      suffix="%"
      value={loanState.rentGrowthRate}
      step="0.1"
      onValueChange={(value) => onUpdateLoanField(optionId, "rentGrowthRate", value)}
    />
  );
}

function LoanOptionDetailsSummary({ loanState }: { loanState: MortgageState["options"][number] }) {
  if (loanState.kind === "rent") {
    return `Grows ${(loanState.rentGrowthRate ?? 0).toFixed(1)}% / year`;
  }

  if (loanState.kind !== "arm") {
    return null;
  }

  return `Fixed ${loanState.fixedYears ?? 0} years, resets to ${(loanState.adjustedRate ?? 0).toFixed(3)}%`;
}

function MortgageLoanOptionCard({
  expandedLoanId,
  mortgage,
  optionId,
  optionCount,
  currentYear,
  onRemoveLoan,
  onSelectLoan,
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
              className="flex-1"
              label="Option name"
              value={loanState.name}
              onChange={(event) => onUpdateLoanName(optionId, event.target.value)}
            />
            {loan.kind === "rent" ? (
              <NumberField
                compact
                className="w-min min-w-40"
                label="Rent"
                prefix="$"
                suffix="/ month"
                value={loanState.rentPerMonth}
                step="1"
                onValueChange={(value) => onUpdateLoanField(optionId, "rentPerMonth", value)}
              />
            ) : (
              <div className="pb-2 text-lg font-semibold text-(--ink-soft)">
                {usd(getMortgageMonthlyPaymentForYear(scenario, currentYear))} / month
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {loan.kind === "arm" ? (
              <ArmLoanHeaderFields optionId={optionId} loanState={loanState} onUpdateLoanField={onUpdateLoanField} />
            ) : loan.kind !== "rent" ? (
              <ConventionalLoanHeaderFields
                optionId={optionId}
                loanState={loanState}
                onUpdateLoanField={onUpdateLoanField}
              />
            ) : null}
          </div>
        </div>
      }
      detailsTitle="Option details"
      detailsSummary={<LoanOptionDetailsSummary loanState={loanState} />}
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
            { value: "rent", label: "Rent" },
          ]}
        />
      </div>
      {loan.kind === "arm" ? (
        <ArmLoanDetails optionId={optionId} loanState={loanState} onUpdateLoanField={onUpdateLoanField} />
      ) : loan.kind === "rent" ? (
        <RentDetails optionId={optionId} loanState={loanState} onUpdateLoanField={onUpdateLoanField} />
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
