import React from "react";
import { NumberField, TextField } from "./Field";
import { ProjectedValueDisplay } from "./ProjectedValueDisplay";
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

type Loan = Mortgage["options"][number];
type LoanState = MortgageState["options"][number];

type MortgageLoanOptionCardProps = {
  expandedLoanId: string | null;
  loan: Loan;
  loanState: LoanState;
  optionCount: number;
  currentYear: number;
  onRemoveLoan: (optionId: string) => void;
  onSelectLoan: (optionId: string) => void;
  onSetExpandedLoanId: (optionId: string | null) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  onUpdateLoanKind: (optionId: string, kind: MortgageOptionKind) => void;
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
  expandedLoanId,
  loan,
  loanState,
  optionCount,
  currentYear,
  onRemoveLoan,
  onSelectLoan,
  onSetExpandedLoanId,
  onUpdateLoanField,
  onUpdateLoanKind,
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
      removeLabel={optionCount > 1 ? `Remove ${loanState.name || "mortgage option"}` : undefined}
      onRemove={optionCount > 1 ? () => onRemoveLoan(loan.id) : undefined}
      details={
        <>
          <SegmentedToggle
            label="Type"
            ariaLabel={`Loan type for ${loanState.name || "mortgage option"}`}
            className="w-fit"
            value={loanState.kind}
            onChange={(kind) => onUpdateLoanKind(loan.id, kind)}
            options={[
              { value: "conventional", label: "Conv" },
              { value: "arm", label: "ARM" },
              { value: "rent", label: "Rent" },
            ]}
          />
          {loan.kind === "arm" ? (
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
          ) : null}
        </>
      }
      detailsTitle="Option details"
      detailsSummary={detailsSummary}
      detailsOpen={expandedLoanId === loan.id}
      onToggleDetails={(open) => onSetExpandedLoanId(open ? loan.id : null)}
    >
      <div className="flex items-end gap-4">
        <TextField
          className="flex-1"
          label="Option name"
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
            step="1"
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
