import React, { useEffect, useMemo, useState } from "react";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { ChartPanel } from "../components/ChartPanel";
import { MortgageComparisonTable, MortgageLoanOptionList } from "../components/MortgageLoanOptions";
import { MortgageBalanceChart, MortgageCompositionChart } from "../components/MortgageCharts";
import { NumberField, fieldLabelClass } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { ResultList } from "../components/ResultList";
import { Section } from "../components/Section";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { roundTo, usd } from "../lib/format";
import {
  ADVANCED_FIELDS,
  buildMortgageInputs,
  DEFAULT_MORTGAGE_STATE,
  LOAN_OPTIONS,
} from "../lib/mortgageConfig";
import { buildMortgageScenario } from "../lib/mortgageSchedule";
import { buildMortgageComparisonRows, buildMortgageSummaryItems, serializeMortgageSummary } from "../lib/mortgagePage";
import { saveJson } from "../lib/storage";
import { MORTGAGE_STATE_KEY, MORTGAGE_SUMMARY_KEY } from "../lib/storageKeys";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";

export function MortgagePage() {
  const [expandedLoanType, setExpandedLoanType] = useState(null);
  const [storedState, setState] = useStoredState(MORTGAGE_STATE_KEY, DEFAULT_MORTGAGE_STATE);
  const state = useMemo(
    () => ({
      ...DEFAULT_MORTGAGE_STATE,
      ...storedState,
      loanOptions: Object.fromEntries(
        LOAN_OPTIONS.map((option) => [
          option.type,
          {
            ...DEFAULT_MORTGAGE_STATE.loanOptions[option.type],
            ...(storedState.loanOptions?.[option.type] ?? {}),
          },
        ]),
      ),
    }),
    [storedState],
  );
  const inputs = useMemo(() => buildMortgageInputs(state), [state]);
  const scenariosByType = useMemo(
    () => Object.fromEntries(LOAN_OPTIONS.map((option) => [option.type, buildMortgageScenario(inputs, option.type)])),
    [inputs],
  );
  const scenario = scenariosByType[inputs.activeLoanType];
  const compareScenario = useMemo(
    () => scenariosByType[inputs.compareLoanType],
    [inputs.compareLoanType, scenariosByType],
  );

  useEffect(() => {
    saveJson(MORTGAGE_SUMMARY_KEY, serializeMortgageSummary(scenario));
  }, [scenario]);

  const comparisonRows = useMemo(
    () => buildMortgageComparisonRows(scenario, compareScenario),
    [compareScenario, scenario],
  );
  const summaryItems = useMemo(() => buildMortgageSummaryItems(scenario), [scenario]);

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

  function handleDownPaymentMode(mode) {
    setState((current) => {
      if (current.downPaymentMode === mode) {
        return current;
      }

      const inputs = buildMortgageInputs(current);
      const currentAmount =
        current.downPaymentMode === "percent" ? (inputs.homePrice * inputs.downPaymentInput) / 100 : inputs.downPaymentInput;
      const convertedValue =
        mode === "percent" ? (inputs.homePrice > 0 ? (currentAmount / inputs.homePrice) * 100 : 0) : currentAmount;

      return {
        ...current,
        downPaymentMode: mode,
        downPayment:
          mode === "percent"
            ? String(roundTo(convertedValue, 3)).replace(/\.?0+$/, "")
            : String(Math.round(convertedValue)),
      };
    });
  }

  function selectLoan(loanType) {
    if (state.activeLoanType !== loanType && expandedLoanType === state.activeLoanType) {
      setExpandedLoanType(null);
    }

    setState((current) => {
      if (current.compareLoanType !== loanType) {
        return { ...current, activeLoanType: loanType };
      }

      const fallbackCompareType = LOAN_OPTIONS.find((option) => option.type !== loanType)?.type ?? loanType;

      return {
        ...current,
        activeLoanType: loanType,
        compareLoanType: fallbackCompareType,
      };
    });
  }

  return (
    <PageShell>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip kicker="Estimated monthly payment" value={usd(scenario.totalMonthlyPayment)} />
              <div className="mt-4 border-b border-(--line) pb-4">
                <div className="grid gap-4">
                  <NumberField
                    label="Home price"
                    prefix="$"
                    value={state.homePrice}
                    step="1"
                    onChange={(event) => updateState({ homePrice: event.target.value })}
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
                        value={state.downPayment}
                        step={state.downPaymentMode === "dollar" ? "1" : "0.001"}
                        onChange={(event) => updateState({ downPayment: event.target.value })}
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
                      value={state[config.field]}
                      step={config.step}
                      onChange={(event) => updateState({ [config.field]: event.target.value })}
                    />
                  ))}
                </div>
              </AdvancedPanel>
            </>
          }
        >
          <Section title="Loan Options">
            <MortgageLoanOptionList
              expandedLoanType={expandedLoanType}
              inputs={inputs}
              scenariosByType={scenariosByType}
              state={state}
              onSelectLoan={selectLoan}
              onSetCompareLoanType={(loanType) => updateState({ compareLoanType: loanType })}
              onSetExpandedLoanType={setExpandedLoanType}
              onUpdateLoanField={updateLoanField}
            />
          </Section>

          <Section title="Charts" divider>
            <div className="grid gap-4">
              <ChartPanel title="Balance Over Time" legend={[{ label: "Remaining balance", color: "#0c6a7c" }]}>
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
              <MortgageComparisonTable
                compareScenario={compareScenario}
                comparisonRows={comparisonRows}
                scenario={scenario}
              />
            </Section>
          ) : null}
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
