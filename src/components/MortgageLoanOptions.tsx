import React from "react";
import { NumberField, TextField } from "./Field";
import { ProjectedValueDisplay } from "./ProjectedValueDisplay";
import { RowItem } from "./RowItem";
import { usd } from "../lib/format";
import { getMortgageMonthlyPaymentForYear } from "../lib/mortgagePage";
import { type Mortgage, type MortgageLoanField, type MortgageState } from "../lib/mortgageConfig";
import { type MortgageScenario } from "../lib/mortgageSchedule";

type Loan = Mortgage["options"][number];
type LoanState = MortgageState["options"][number];

type MortgageLoanOptionCardProps = {
  loan: Loan;
  loanState: LoanState;
  optionCount: number;
  currentYear: number;
  onRemoveLoan: (optionId: string) => void;
  onSelectLoan: (optionId: string) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | string | null) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  scenario: MortgageScenario;
  selected: boolean;
};

type MortgageLoanOptionListProps = Omit<
  MortgageLoanOptionCardProps,
  "loan" | "loanState" | "optionCount" | "scenario" | "selected"
> & {
  mortgage: Mortgage;
  scenariosById: Record<string, MortgageScenario>;
  state: MortgageState;
};

function MortgageLoanOptionCard({
  loan,
  loanState,
  optionCount,
  currentYear,
  onRemoveLoan,
  onSelectLoan,
  onUpdateLoanField,
  onUpdateLoanName,
  scenario,
  selected,
}: MortgageLoanOptionCardProps) {
  const detailsSummary =
    loanState.kind === "rent"
      ? `Yearly increase ${(loanState.rentGrowthRate ?? 0).toFixed(1)}%`
      : loanState.kind === "arm"
        ? `Fixed ${loanState.fixedYears ?? 0} years, resets to ${(loanState.adjustedRate ?? 0).toFixed(3)}%`
        : null;

  return (
    <RowItem
      bodyClassName="grid gap-4"
      selected={selected}
      onSelect={() => onSelectLoan(loan.id)}
      removeLabel={optionCount > 1 ? `Remove ${loanState.name || "scenario"}` : undefined}
      onRemove={optionCount > 1 ? () => onRemoveLoan(loan.id) : undefined}
      details={
        loan.kind === "arm" ? (
          <>
            <NumberField
              label="Reset rate"
              suffix="%"
              value={loanState.adjustedRate}
              step="0.125"
              onValueChange={(value) => onUpdateLoanField(loan.id, "adjustedRate", value)}
            />
            <NumberField
              label="Fixed years"
              suffix="years"
              value={loanState.fixedYears}
              step="1"
              onValueChange={(value) => onUpdateLoanField(loan.id, "fixedYears", value)}
            />
          </>
        ) : loan.kind === "rent" ? (
          <NumberField
            label="Yearly increase"
            suffix="%"
            value={loanState.rentGrowthRate}
            step="0.5"
            onValueChange={(value) => onUpdateLoanField(loan.id, "rentGrowthRate", value)}
          />
        ) : null
      }
      detailsTitle="Scenario details"
      detailsSummary={detailsSummary}
    >
      <div className="flex gap-4">
        <TextField
          className="flex-1"
          label="Scenario name"
          value={loanState.name}
          onChange={(event) => onUpdateLoanName(loan.id, event.target.value)}
        />
        {loan.kind === "rent" ? (
          <NumberField
            className="w-48"
            label="Rent"
            prefix="$"
            suffix="/ month"
            value={loanState.rentPerMonth}
            step="50"
            onValueChange={(value) => onUpdateLoanField(loan.id, "rentPerMonth", value)}
          />
        ) : (
          <div className="w-40">
            <ProjectedValueDisplay
              label={currentYear === 0 ? "Today" : `Year ${currentYear}`}
              value={`${usd(getMortgageMonthlyPaymentForYear(scenario, currentYear))} / month`}
            />
          </div>
        )}
      </div>
      {loan.kind !== "rent" ? (
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label={loan.kind === "arm" ? "Initial rate" : "Interest rate"}
            suffix="%"
            value={loan.kind === "arm" ? loanState.initialRate : loanState.rate}
            step="0.125"
            onValueChange={(value) => onUpdateLoanField(loan.id, loan.kind === "arm" ? "initialRate" : "rate", value)}
          />
          <NumberField
            label="Loan term"
            suffix="years"
            value={loanState.term}
            step="1"
            onValueChange={(value) => onUpdateLoanField(loan.id, "term", value)}
          />
        </div>
      ) : null}
    </RowItem>
  );
}

export function MortgageLoanOptionList(props: MortgageLoanOptionListProps) {
  const optionCount = props.state.options.length;

  return (
    <div className="grid gap-2" role="list">
      {props.state.options.map((loanState) => {
        const loan = props.mortgage.options.find((entry) => entry.id === loanState.id);
        const scenario = props.scenariosById[loanState.id];

        if (!loan || !scenario) {
          return null;
        }

        return (
          <MortgageLoanOptionCard
            key={loanState.id}
            {...props}
            loan={loan}
            loanState={loanState}
            optionCount={optionCount}
            scenario={scenario}
            selected={props.state.activeLoanId === loanState.id}
          />
        );
      })}
    </div>
  );
}
