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
import { usd } from "../lib/format";
import { ADVANCED_FIELDS, FIELD_CONFIGS, getLoanFieldFallback, LOAN_FIELD_CONFIGS, LOAN_OPTIONS, NUMERIC_DEFAULTS } from "../lib/mortgageConfig";
import { buildMortgageScenario } from "../lib/mortgageSchedule";
import {
  createDefaultMortgageState,
  getDownPaymentNumericValue,
  normalizeMortgageInputs,
  normalizeMortgageState,
  readSafeMortgageValue,
  sanitizeMortgageDownPayment,
  sanitizeMortgageValue,
} from "../lib/mortgageNormalization";
import { buildMortgageComparisonRows, buildMortgageSummaryItems, serializeMortgageSummary } from "../lib/mortgagePage";
import { saveJson } from "../lib/storage";
import { MORTGAGE_STATE_KEY, MORTGAGE_SUMMARY_KEY } from "../lib/storageKeys";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";

export function MortgagePage() {
  const [expandedLoanType, setExpandedLoanType] = useState(null);
  const [state, setState] = useStoredState(MORTGAGE_STATE_KEY, createDefaultMortgageState, {
    normalize: normalizeMortgageState,
  });
  const inputs = useMemo(() => normalizeMortgageInputs(state), [state]);
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

  function commitTopField(field) {
    setState((current) => ({
      ...current,
      [field]: sanitizeMortgageValue(current[field], FIELD_CONFIGS[field], NUMERIC_DEFAULTS[field]),
    }));
  }

  function commitDownPayment() {
    setState((current) => {
      const homePrice = readSafeMortgageValue(current.homePrice, FIELD_CONFIGS.homePrice, NUMERIC_DEFAULTS.homePrice);

      return {
        ...current,
        downPayment: sanitizeMortgageDownPayment(current.downPayment, homePrice, current.downPaymentMode),
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

      const homePrice = readSafeMortgageValue(current.homePrice, FIELD_CONFIGS.homePrice, NUMERIC_DEFAULTS.homePrice);
      const currentRaw = getDownPaymentNumericValue(homePrice, current.downPayment, current.downPaymentMode);
      const currentAmount = current.downPaymentMode === "percent" ? (homePrice * currentRaw) / 100 : currentRaw;
      const convertedValue =
        mode === "percent" ? (homePrice > 0 ? (currentAmount / homePrice) * 100 : 0) : currentAmount;

      return {
        ...current,
        downPaymentMode: mode,
        downPayment:
          mode === "percent" ? convertedValue.toFixed(3).replace(/\.?0+$/, "") : String(Math.round(convertedValue)),
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
                    min={FIELD_CONFIGS.homePrice.min}
                    max={FIELD_CONFIGS.homePrice.max}
                    step="1"
                    onChange={(event) => updateState({ homePrice: event.target.value })}
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
                        value={state.downPayment}
                        min="0"
                        max={state.downPaymentMode === "dollar" ? inputs.homePrice : 100}
                        step={state.downPaymentMode === "dollar" ? "1" : "0.001"}
                        onChange={(event) => updateState({ downPayment: event.target.value })}
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
                      value={state[config.field]}
                      min={FIELD_CONFIGS[config.field].min}
                      max={FIELD_CONFIGS[config.field].max}
                      step={config.step}
                      onChange={(event) => updateState({ [config.field]: event.target.value })}
                      onBlur={() => commitTopField(config.field)}
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
              onCommitLoanField={commitLoanField}
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
