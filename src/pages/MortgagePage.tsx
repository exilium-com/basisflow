import React, { useEffect, useState } from "react";
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
  buildMortgageInputs,
  DEFAULT_MORTGAGE_STATE,
  LOAN_OPTIONS,
  type LoanType,
  type MortgageDownPaymentMode,
  type MortgageLoanField,
  type MortgageState,
  normalizeMortgageState,
} from "../lib/mortgageConfig";
import { buildMortgageScenario, type MortgageScenario } from "../lib/mortgageSchedule";
import { buildMortgageComparisonRows, buildMortgageSummaryItems, serializeMortgageSummary } from "../lib/mortgagePage";
import { saveJson } from "../lib/storage";
import { MORTGAGE_STATE_KEY, MORTGAGE_SUMMARY_KEY } from "../lib/storageKeys";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";

export function MortgagePage() {
  const [expandedLoanType, setExpandedLoanType] = useState<LoanType | null>(null);
  const [state, setState] = useStoredState(MORTGAGE_STATE_KEY, DEFAULT_MORTGAGE_STATE, {
    normalize: normalizeMortgageState,
  });
  const inputs = buildMortgageInputs(state);
  const scenariosByType = Object.fromEntries(
    LOAN_OPTIONS.map((option) => [option.type, buildMortgageScenario(inputs, option.type)]),
  ) as Record<LoanType, MortgageScenario>;
  const scenario = scenariosByType[inputs.activeLoanType];
  const compareScenario = scenariosByType[inputs.compareLoanType];

  useEffect(() => {
    saveJson(MORTGAGE_SUMMARY_KEY, serializeMortgageSummary(scenario));
  }, [scenario]);

  const comparisonRows = buildMortgageComparisonRows(scenario, compareScenario);
  const summaryItems = buildMortgageSummaryItems(scenario);

  function updateState(patch: Partial<MortgageState>) {
    setState((draft) => {
      Object.assign(draft, patch);
    });
  }

  function updateLoanField(type: LoanType, field: MortgageLoanField, value: number | null) {
    setState((draft) => {
      draft.loanOptions[type][field] = value;
    });
  }

  function handleDownPaymentMode(mode: MortgageDownPaymentMode) {
    setState((draft) => {
      if (draft.downPaymentMode === mode) {
        return;
      }

      const inputs = buildMortgageInputs(draft);
      const currentAmount =
        draft.downPaymentMode === "percent" ? (inputs.homePrice * inputs.downPaymentInput) / 100 : inputs.downPaymentInput;
      const convertedValue =
        mode === "percent" ? (inputs.homePrice > 0 ? (currentAmount / inputs.homePrice) * 100 : 0) : currentAmount;

      draft.downPaymentMode = mode;
      draft.downPayment = mode === "percent" ? roundTo(convertedValue, 3) : Math.round(convertedValue);
    });
  }

  function selectLoan(loanType: LoanType) {
    if (state.activeLoanType !== loanType && expandedLoanType === state.activeLoanType) {
      setExpandedLoanType(null);
    }

    setState((draft) => {
      if (draft.compareLoanType !== loanType) {
        draft.activeLoanType = loanType;
        return;
      }

      const fallbackCompareType = LOAN_OPTIONS.find((option) => option.type !== loanType)?.type ?? loanType;
      draft.activeLoanType = loanType;
      draft.compareLoanType = fallbackCompareType;
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
                    onValueChange={(value) => updateState({ homePrice: value ?? 0 })}
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
                        className="min-w-0 flex-1"
                        value={state.downPayment}
                        step={state.downPaymentMode === "dollar" ? "1" : "0.001"}
                        onValueChange={(value) => updateState({ downPayment: value ?? 0 })}
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
                  <NumberField
                    label="Property tax rate"
                    suffix="%"
                    value={state.propertyTaxRate}
                    step="0.001"
                    onValueChange={(value) => updateState({ propertyTaxRate: value ?? 0 })}
                  />
                  <NumberField
                    label="Home insurance"
                    prefix="$"
                    suffix="/ year"
                    value={state.insurancePerYear}
                    step="1"
                    onValueChange={(value) => updateState({ insurancePerYear: value ?? 0 })}
                  />
                  <NumberField
                    label="HOA"
                    prefix="$"
                    suffix="/ month"
                    value={state.hoaPerMonth}
                    step="1"
                    onValueChange={(value) => updateState({ hoaPerMonth: value ?? 0 })}
                  />
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
