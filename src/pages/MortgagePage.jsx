import React, { useEffect, useMemo, useState } from "react";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { ActionButton } from "../components/ActionButton";
import { ChartPanel } from "../components/ChartPanel";
import { MortgageBalanceChart, MortgageCompositionChart } from "../components/MortgageCharts";
import { NumberField, fieldLabelClass } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { ResultList } from "../components/ResultList";
import { RowItem } from "../components/RowItem";
import { Section } from "../components/Section";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { usd } from "../lib/format";
import {
  ADVANCED_FIELDS,
  buildMortgageScenario,
  createDefaultMortgageState,
  FIELD_CONFIGS,
  getDownPaymentNumericValue,
  getLoanFieldFallback,
  getMortgageLoanMeta,
  getMortgageValidation,
  LOAN_FIELD_CONFIGS,
  LOAN_OPTIONS,
  normalizeMortgageInputs,
  normalizeMortgageState,
  NUMERIC_DEFAULTS,
  readSafeMortgageValue,
  sanitizeMortgageDownPayment,
  sanitizeMortgageValue,
} from "../lib/mortgageModel";
import { saveJson } from "../lib/storage";
import {
  MORTGAGE_STATE_KEY,
  MORTGAGE_SUMMARY_KEY,
} from "../lib/storageKeys";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";

export function MortgagePage() {
  const [expandedLoanType, setExpandedLoanType] = useState(null);
  const [state, setState] = useStoredState(
    MORTGAGE_STATE_KEY,
    createDefaultMortgageState,
    {
      normalize: normalizeMortgageState,
    },
  );
  const inputs = useMemo(() => normalizeMortgageInputs(state), [state]);
  const scenariosByType = useMemo(
    () =>
      Object.fromEntries(
        LOAN_OPTIONS.map((option) => [
          option.type,
          buildMortgageScenario(inputs, option.type),
        ]),
      ),
    [inputs],
  );
  const scenario = scenariosByType[inputs.activeLoanType];
  const compareScenario = useMemo(
    () => scenariosByType[inputs.compareLoanType],
    [inputs.compareLoanType, scenariosByType],
  );
  const validation = useMemo(() => getMortgageValidation(state), [state]);

  useEffect(() => {
    const yearlyLoan = scenario.yearlyBreakdown.map((row) => {
      const monthIndex = Math.min(row.year * 12, scenario.schedule.length) - 1;
      const endingBalance =
        monthIndex >= 0
          ? scenario.schedule[monthIndex].balance
          : scenario.loanAmount;

      return {
        year: row.year,
        principal: row.principal,
        interest: row.interest,
        endingBalance,
      };
    });

    saveJson(MORTGAGE_SUMMARY_KEY, {
      type: scenario.type,
      typeLabel: scenario.typeLabel,
      isArm: scenario.isArm,
      homePrice: scenario.inputs.homePrice,
      currentEquity: scenario.inputs.homePrice - scenario.loanAmount,
      loanAmount: scenario.loanAmount,
      totalMonthlyPayment: scenario.totalMonthlyPayment,
      principalInterest: scenario.principalInterest,
      monthlyTax: scenario.monthlyTax,
      monthlyInsurance: scenario.monthlyInsurance,
      monthlyHoa: scenario.monthlyHoa,
      totalInterest: scenario.totalInterest,
      yearlyLoan,
    });
  }, [scenario]);

  const comparisonRows = [
    {
      label: "Monthly payment",
      left: usd(scenario.totalMonthlyPayment),
      right: usd(compareScenario.totalMonthlyPayment),
    },
    {
      label: "Principal and interest",
      left: usd(scenario.principalInterest),
      right: usd(compareScenario.principalInterest),
    },
    {
      label: "Rate",
      left: `${scenario.primaryRate.toFixed(3)}%`,
      right: `${compareScenario.primaryRate.toFixed(3)}%`,
    },
    {
      label: "Total interest",
      left: usd(scenario.totalInterest),
      right: usd(compareScenario.totalInterest),
    },
  ];

  const summaryItems = [
    { label: "Loan amount", value: usd(scenario.loanAmount) },
    {
      label: "Monthly principal and interest",
      value: usd(scenario.principalInterest),
    },
    { label: "Monthly property tax", value: usd(scenario.monthlyTax) },
    { label: "Monthly insurance", value: usd(scenario.monthlyInsurance) },
    { label: "Monthly HOA", value: usd(scenario.monthlyHoa) },
    { label: "Total interest", value: usd(scenario.totalInterest) },
  ];

  function updateState(patch) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateLoanField(type, field, value) {
    setState((current) => ({
      ...current,
      loanOptions: {
        ...current.loanOptions,
        [type]: {
          ...current.loanOptions[type],
          [field]: value,
        },
      },
    }));
  }

  function commitTopField(field) {
    setState((current) => ({
      ...current,
      [field]: sanitizeMortgageValue(
        current[field],
        FIELD_CONFIGS[field],
        NUMERIC_DEFAULTS[field],
      ),
    }));
  }

  function commitDownPayment() {
    setState((current) => {
      const homePrice = readSafeMortgageValue(
        current.homePrice,
        FIELD_CONFIGS.homePrice,
        NUMERIC_DEFAULTS.homePrice,
      );

      return {
        ...current,
        downPayment: sanitizeMortgageDownPayment(
          current.downPayment,
          homePrice,
          current.downPaymentMode,
        ),
      };
    });
  }

  function commitLoanField(type, field) {
    setState((current) => {
      const config = LOAN_FIELD_CONFIGS[type][field];
      const allowBlank = field === "adjustedRate";

      return {
        ...current,
        loanOptions: {
          ...current.loanOptions,
          [type]: {
            ...current.loanOptions[type],
            [field]: sanitizeMortgageValue(
              current.loanOptions[type][field],
              config,
              getLoanFieldFallback(type, field),
              { allowBlank },
            ),
          },
        },
      };
    });
  }

  function handleDownPaymentMode(mode) {
    setState((current) => {
      if (current.downPaymentMode === mode) {
        return current;
      }

      const homePrice = readSafeMortgageValue(
        current.homePrice,
        FIELD_CONFIGS.homePrice,
        NUMERIC_DEFAULTS.homePrice,
      );
      const currentRaw = getDownPaymentNumericValue(
        homePrice,
        current.downPayment,
        current.downPaymentMode,
      );
      const currentAmount =
        current.downPaymentMode === "percent"
          ? (homePrice * currentRaw) / 100
          : currentRaw;
      const convertedValue =
        mode === "percent"
          ? homePrice > 0
            ? (currentAmount / homePrice) * 100
            : 0
          : currentAmount;

      return {
        ...current,
        downPaymentMode: mode,
        downPayment:
          mode === "percent"
            ? convertedValue.toFixed(3).replace(/\.?0+$/, "")
            : String(Math.round(convertedValue)),
      };
    });
  }

  function reset() {
    setState(createDefaultMortgageState());
  }

  function selectLoan(loanType) {
    if (
      state.activeLoanType !== loanType &&
      expandedLoanType === state.activeLoanType
    ) {
      setExpandedLoanType(null);
    }

    setState((current) => {
      if (current.compareLoanType !== loanType) {
        return { ...current, activeLoanType: loanType };
      }

      const fallbackCompareType =
        LOAN_OPTIONS.find((option) => option.type !== loanType)?.type ?? loanType;

      return {
        ...current,
        activeLoanType: loanType,
        compareLoanType: fallbackCompareType,
      };
    });
  }

  function renderLoanOptionCard(option) {
    const loanType = option.type;
    const loanScenario = scenariosByType[loanType];
    const loanInputs = inputs.loanOptions[loanType];
    const loanState = state.loanOptions[loanType];
    const loanValidation = validation.loanOptions[loanType];

    return (
      <RowItem
        key={loanType}
        selected={state.activeLoanType === loanType}
        onSelect={() => selectLoan(loanType)}
        headerClassName="grid items-center gap-2"
        header={
          <>
            <div className="text-base font-bold text-(--ink)">{option.label}</div>
            <div className="text-sm text-(--ink-soft)">
              {usd(loanScenario.totalMonthlyPayment)}
            </div>
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
            aria-pressed={
              state.activeLoanType !== loanType &&
              state.compareLoanType === loanType
            }
            disabled={state.activeLoanType === loanType}
            onClick={() => updateState({ compareLoanType: loanType })}
          >
            Compare
          </button>
        }
        detailsTitle="Rate details"
        detailsSummary={getMortgageLoanMeta(loanInputs)}
        detailsOpen={expandedLoanType === loanType}
        onToggleDetails={(open) =>
          setExpandedLoanType(open ? loanType : null)
        }
        detailsContentClassName="grid gap-3 sm:grid-cols-3"
      >
        {option.fields.map((config) => (
          <NumberField
            key={config.field}
            label={config.label}
            prefix={config.prefix}
            suffix={config.suffix}
            invalid={loanValidation[config.field]}
            value={loanState[config.field]}
            min={LOAN_FIELD_CONFIGS[loanType][config.field].min}
            max={LOAN_FIELD_CONFIGS[loanType][config.field].max}
            step={config.step}
            placeholder={
              config.placeholderFrom
                ? String(loanInputs[config.placeholderFrom])
                : undefined
            }
            onChange={(event) =>
              updateLoanField(loanType, config.field, event.target.value)
            }
            onBlur={() => commitLoanField(loanType, config.field)}
          />
        ))}
      </RowItem>
    );
  }

  return (
    <PageShell actions={<ActionButton onClick={reset}>Reset</ActionButton>}>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip
                kicker="Estimated monthly payment"
                value={usd(scenario.totalMonthlyPayment)}
              />
              <div className="mt-4 border-b border-(--line) pb-4">
                <div className="grid gap-4">
                  <NumberField
                    label="Home price"
                    prefix="$"
                    invalid={validation.homePrice}
                    value={state.homePrice}
                    min={FIELD_CONFIGS.homePrice.min}
                    max={FIELD_CONFIGS.homePrice.max}
                    step="1"
                    onChange={(event) =>
                      updateState({ homePrice: event.target.value })
                    }
                    onBlur={() => commitTopField("homePrice")}
                  />

                  <div className="grid min-w-0 gap-1">
                    <div className={fieldLabelClass}>Down payment</div>
                    <div className="flex items-start gap-2">
                      <SegmentedToggle
                        ariaLabel="Down payment mode"
                        className="shrink-0"
                        value={state.downPaymentMode}
                        onChange={handleDownPaymentMode}
                        options={[
                          { value: "dollar", label: "$" },
                          { value: "percent", label: "%" },
                        ]}
                      />
                      <NumberField
                        label={null}
                        className="min-w-0 flex-1"
                        invalid={validation.downPayment}
                        value={state.downPayment}
                        min="0"
                        max={
                          state.downPaymentMode === "dollar"
                            ? inputs.homePrice
                            : 100
                        }
                        step={
                          state.downPaymentMode === "dollar" ? "1" : "0.001"
                        }
                        onChange={(event) =>
                          updateState({ downPayment: event.target.value })
                        }
                        onBlur={commitDownPayment}
                      />
                    </div>
                  </div>

                </div>
              </div>
              <ResultList items={summaryItems} live />
              <AdvancedPanel
                id="mortgageParameters"
                title="Mortgage parameters"
                open={state.advancedOpen}
                onToggle={(open) => updateState({ advancedOpen: open })}
              >
                <div className="grid gap-4">
                  {ADVANCED_FIELDS.map((config) => (
                    <NumberField
                      key={config.field}
                      label={config.label}
                      prefix={config.prefix}
                      suffix={config.suffix}
                      invalid={validation[config.field]}
                      value={state[config.field]}
                      min={FIELD_CONFIGS[config.field].min}
                      max={FIELD_CONFIGS[config.field].max}
                      step={config.step}
                      onChange={(event) =>
                        updateState({ [config.field]: event.target.value })
                      }
                      onBlur={() => commitTopField(config.field)}
                    />
                  ))}
                </div>
              </AdvancedPanel>
            </>
          }
        >
          <Section title="Loan Options">
            <div className="grid gap-2.5" role="list">
              {LOAN_OPTIONS.map(renderLoanOptionCard)}
            </div>
          </Section>

          <Section title="Charts" divider>
            <div className="grid gap-4">
              <ChartPanel
                title="Balance Over Time"
                legend={[{ label: "Remaining balance", color: "#0c6a7c" }]}
              >
                <MortgageBalanceChart scenario={scenario} />
              </ChartPanel>
              <ChartPanel
                title="Principal vs Interest"
                legend={[
                  { label: "Principal", color: "#0c6a7c" },
                  { label: "Interest", color: "#d28a47" },
                ]}
              >
                <MortgageCompositionChart scenario={scenario} />
              </ChartPanel>
            </div>
          </Section>

          {state.activeLoanType !== state.compareLoanType ? (
            <Section title="Comparison" divider>
              <article className="border border-(--line-soft) bg-(--white-soft) px-4 pt-4 pb-2">
                <p className="mb-3 text-sm leading-relaxed text-(--ink-soft)">
                  {`${scenario.typeLabel} against ${compareScenario.typeLabel}`}
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="border-b border-b-(--line-soft) py-2.5 text-left text-xs font-extrabold uppercase tracking-wide text-(--ink-soft)"
                      >
                        Metric
                      </th>
                      <th
                        scope="col"
                        className="border-b border-b-(--line-soft) py-2.5 text-right text-xs font-extrabold uppercase tracking-wide text-(--ink-soft)"
                      >
                        {scenario.typeLabel}
                      </th>
                      <th
                        scope="col"
                        className="border-b border-b-(--line-soft) py-2.5 text-right text-xs font-extrabold uppercase tracking-wide text-(--ink-soft)"
                      >
                        {compareScenario.typeLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label}>
                        <td className="border-b border-b-(--line-soft) py-3 text-left text-sm text-(--ink)">
                          {row.label}
                        </td>
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
            </Section>
          ) : null}
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
