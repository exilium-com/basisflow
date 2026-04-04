import React from "react";
import { NumberField } from "./Field";
import { RowItem } from "./RowItem";
import { usd } from "../lib/format";
import { getMortgageLoanMeta, LOAN_OPTIONS } from "../lib/mortgageConfig";

function MortgageLoanOptionCard({
  expandedLoanType,
  inputs,
  loanType,
  onSelectLoan,
  onSetCompareLoanType,
  onSetExpandedLoanType,
  onUpdateLoanField,
  option,
  scenario,
  state,
}) {
  const loanInputs = inputs.loanOptions[loanType];
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
      detailsSummary={getMortgageLoanMeta(loanInputs)}
      detailsOpen={expandedLoanType === loanType}
      onToggleDetails={(open) => onSetExpandedLoanType(open ? loanType : null)}
      detailsContentClassName="grid gap-3 sm:grid-cols-3"
    >
      {option.fields.map((config) => (
        <NumberField
          key={config.field}
          label={config.label}
          prefix={config.prefix}
          suffix={config.suffix}
          value={loanState[config.field]}
          step={config.step}
          placeholder={config.placeholderFrom ? String(loanInputs[config.placeholderFrom]) : undefined}
          onChange={(event) => onUpdateLoanField(loanType, config.field, event.target.value)}
        />
      ))}
    </RowItem>
  );
}

export function MortgageLoanOptionList(props) {
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

export function MortgageComparisonTable({ compareScenario, comparisonRows, scenario }) {
  return (
    <article className="border border-(--line-soft) bg-(--white-soft) px-4 pt-4 pb-2">
      <p className="mb-3 text-sm leading-relaxed text-(--ink-soft)">
        {`${scenario.typeLabel} against ${compareScenario.typeLabel}`}
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-b-(--line-soft) py-2.5 text-left text-xs font-extrabold tracking-wide
                text-(--ink-soft) uppercase"
            >
              Metric
            </th>
            <th
              scope="col"
              className="border-b border-b-(--line-soft) py-2.5 text-right text-xs font-extrabold tracking-wide
                text-(--ink-soft) uppercase"
            >
              {scenario.typeLabel}
            </th>
            <th
              scope="col"
              className="border-b border-b-(--line-soft) py-2.5 text-right text-xs font-extrabold tracking-wide
                text-(--ink-soft) uppercase"
            >
              {compareScenario.typeLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisonRows.map((row) => (
            <tr key={row.label}>
              <td className="border-b border-b-(--line-soft) py-3 text-left text-sm text-(--ink)">{row.label}</td>
              <td className="border-b border-b-(--line-soft) py-3 text-right text-base font-semibold text-(--ink)">
                {row.left}
              </td>
              <td className="border-b border-b-(--line-soft) py-3 text-right text-base font-semibold text-(--ink)">
                {row.right}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
