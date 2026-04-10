import React, { useEffect } from "react";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { ActionButton } from "../components/ActionButton";
import { MetricGrid } from "../components/MetricGrid";
import { NumberField, TextField, fieldLabelClass } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { RowItem } from "../components/RowItem";
import { Section } from "../components/Section";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { SliderField } from "../components/SliderField";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { useStoredState } from "../hooks/useStoredState";
import { readNumber, usd } from "../lib/format";
import {
  buildIncomeInputs,
  buildIncomeSummary,
  calculateIncome,
  computeRsuGrossForItems,
  getAnnualSalaryTotal,
  type RsuInputItem,
  type SalaryFrequency,
  type SalaryInputItem,
} from "../lib/incomeModel";
import { getMortgageYearInterest, getMortgageYearPropertyTax, type MortgageSummary } from "../lib/mortgagePage";
import { loadStoredJson, saveJson } from "../lib/storage";
import { loadTaxConfig } from "../lib/taxConfig";
import { INCOME_STATE_KEY, INCOME_SUMMARY_KEY, MORTGAGE_SUMMARY_KEY } from "../lib/storageKeys";
import { surfaceClass } from "../lib/ui";

type SalaryStateItem = {
  id: string;
  type: "salary";
  name: string;
  amount: number | null;
  frequency: SalaryFrequency;
  detailsOpen: boolean;
};

type RsuStateItem = {
  id: string;
  type: "rsu";
  name: string;
  grantAmount: number | null;
  refresherAmount: number | null;
  vestingYears: number | null;
  detailsOpen: boolean;
};

type IncomeStateItem = SalaryStateItem | RsuStateItem;

type IncomeState = {
  incomeItems: IncomeStateItem[];
  employee401k: number;
  matchRate: number;
  iraContribution: number;
  megaBackdoor: number;
  hsaContribution: number;
  incomeParametersOpen: boolean;
};

function createSalaryItem(overrides: Partial<SalaryStateItem> = {}): SalaryStateItem {
  return {
    id: crypto.randomUUID(),
    type: "salary",
    name: "Salary",
    amount: 150000,
    frequency: "annual",
    detailsOpen: false,
    ...overrides,
  };
}

function createRsuItem(overrides: Partial<RsuStateItem> = {}): RsuStateItem {
  return {
    id: crypto.randomUUID(),
    type: "rsu",
    name: "RSU grant",
    grantAmount: 0,
    refresherAmount: 0,
    vestingYears: 4,
    detailsOpen: false,
    ...overrides,
  };
}

const DEFAULTS: IncomeState = {
  incomeItems: [createSalaryItem()],
  employee401k: 0,
  matchRate: 0,
  iraContribution: 0,
  megaBackdoor: 0,
  hsaContribution: 0,
  incomeParametersOpen: false,
};

const INCOME_NUMBER_FIELDS = [
  "employee401k",
  "matchRate",
  "iraContribution",
  "megaBackdoor",
  "hsaContribution",
] as const satisfies ReadonlyArray<keyof IncomeState>;

function normalizeIncomeItem(item: unknown): IncomeStateItem {
  const candidate = typeof item === "object" && item ? (item as Record<string, unknown>) : {};

  if (candidate.type === "rsu") {
    return createRsuItem({
      id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
      name: typeof candidate.name === "string" ? candidate.name : "RSU grant",
      grantAmount: readNumber(candidate.grantAmount, null),
      refresherAmount: readNumber(candidate.refresherAmount, null),
      vestingYears: readNumber(candidate.vestingYears, null) ?? 4,
      detailsOpen: Boolean(candidate.detailsOpen),
    });
  }

  return createSalaryItem({
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    name: typeof candidate.name === "string" ? candidate.name : "Salary",
    amount: readNumber(candidate.amount, null),
    frequency: candidate.frequency === "monthly" ? "monthly" : "annual",
    detailsOpen: Boolean(candidate.detailsOpen),
  });
}

function normalizeState(parsed: unknown, fallback: IncomeState): IncomeState {
  const state = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const numericState = Object.fromEntries(
    INCOME_NUMBER_FIELDS.map((field) =>
      field === "megaBackdoor"
        ? [field, readNumber(state.megaBackdoor ?? state.megaBackdoorInput, fallback.megaBackdoor)]
        : [field, readNumber(state[field], fallback[field])],
    ),
  ) as Pick<IncomeState, (typeof INCOME_NUMBER_FIELDS)[number]>;

  return {
    ...fallback,
    ...numericState,
    incomeItems:
      Array.isArray(state.incomeItems) && state.incomeItems.length > 0
        ? state.incomeItems.map((item) => normalizeIncomeItem(item))
        : fallback.incomeItems.map((item) => normalizeIncomeItem(item)),
    incomeParametersOpen: Boolean(state.incomeParametersOpen),
  };
}

function renderIncomeSummary(item: IncomeStateItem, annualizedSalary: number) {
  if (item.type === "salary") {
    return item.frequency === "monthly" ? `${usd(annualizedSalary)} / year` : "Annual";
  }

  const vestYears = Math.max(1, Math.round(item.vestingYears ?? 4));
  return `${vestYears} year vest`;
}

export function IncomePage() {
  const [state, setState] = useStoredState<IncomeState>(INCOME_STATE_KEY, DEFAULTS, {
    normalize: normalizeState,
  });

  const salaryItems: SalaryInputItem[] = state.incomeItems
    .filter((item): item is SalaryStateItem => item.type === "salary")
    .map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount ?? 0,
      frequency: item.frequency,
    }));
  const rsuItems: RsuInputItem[] = state.incomeItems
    .filter((item): item is RsuStateItem => item.type === "rsu")
    .map((item) => ({
      id: item.id,
      name: item.name,
      grantAmount: item.grantAmount ?? 0,
      refresherAmount: item.refresherAmount ?? 0,
      vestingYears: item.vestingYears ?? 4,
    }));
  const mortgageSummary = (loadStoredJson(MORTGAGE_SUMMARY_KEY) ?? {}) as Partial<MortgageSummary>;
  const inputs = buildIncomeInputs({
    grossSalary: getAnnualSalaryTotal(salaryItems),
    rsuGrossNextYear: computeRsuGrossForItems(rsuItems, 0),
    employee401k: state.employee401k,
    matchRate: state.matchRate,
    iraContribution: state.iraContribution,
    megaBackdoor: state.megaBackdoor,
    hsaContribution: state.hsaContribution,
    mortgageInterest: getMortgageYearInterest(mortgageSummary, 1),
    propertyTax: getMortgageYearPropertyTax(mortgageSummary),
    rsuItems,
  });
  const taxConfig = loadTaxConfig();
  const results = calculateIncome(inputs, taxConfig);

  useEffect(() => {
    saveJson(INCOME_SUMMARY_KEY, buildIncomeSummary(inputs, results));
  }, [inputs, results]);

  function updateField(field: keyof Omit<IncomeState, "incomeItems">, value: IncomeState[keyof Omit<IncomeState, "incomeItems">]) {
    setState((draft) => {
      Object.assign(draft, { [field]: value } as Partial<IncomeState>);
    });
  }

  function updateIncomeItem(itemId: string, patch: Partial<IncomeStateItem>) {
    setState((draft) => {
      const item = draft.incomeItems.find((entry) => entry.id === itemId);
      if (item) {
        Object.assign(item, patch);
      }
    });
  }

  function removeIncomeItem(itemId: string) {
    setState((draft) => {
      draft.incomeItems = draft.incomeItems.filter((item) => item.id !== itemId);
    });
  }

  function addSalaryItem() {
    setState((draft) => {
      draft.incomeItems.push(createSalaryItem({ amount: null }));
    });
  }

  function addRsuItem() {
    setState((draft) => {
      draft.incomeItems.push(createRsuItem());
    });
  }

  const contributionRows: Array<[string, number]> = [
    ["Employee 401(k)", inputs.employee401k],
    ["Employer match", results.employerMatch],
    ["IRA", inputs.iraContribution],
    ["Mega backdoor after-tax", results.megaBackdoor],
    ["HSA", inputs.hsaContribution],
  ];
  const hasRsuItems = rsuItems.length > 0;
  const summaryItems = [
    { label: "Annual salary", value: usd(results.grossSalary, 2) },
    { label: "Monthly take-home", value: usd(results.monthlyTakeHome, 2) },
    ...(hasRsuItems
      ? [
          { label: "Next 12m RSU gross", value: usd(results.rsuGrossNextYear, 2) },
          { label: "Next 12m RSU net", value: usd(results.rsuNetNextYear, 2) },
        ]
      : []),
    {
      label: "Retirement saving",
      value: usd(inputs.employee401k + results.employerMatch + inputs.iraContribution + results.megaBackdoor, 2),
    },
    { label: "Total taxes", value: usd(results.totalTaxes, 2) },
    { label: "Federal tax", value: usd(results.federalTax, 2) },
    { label: "California tax", value: usd(results.californiaTax, 2) },
    { label: "FICA", value: usd(results.fica.total, 2) },
    { label: "CA SDI", value: usd(results.caSdi, 2) },
  ];

  const taxRows: Array<[string, number]> = [
    ["Federal income tax", results.federalTax],
    ["California income tax", results.californiaTax],
    ["Social Security", results.fica.socialSecurity],
    ["Medicare", results.fica.medicare],
    ["Additional Medicare", results.fica.additionalMedicare],
    ["CA SDI", results.caSdi],
  ];

  return (
    <PageShell>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip kicker="Estimated Annual Take-Home" value={usd(results.annualTakeHome, 2)} />

              <div className="mt-6">
                <MetricGrid items={summaryItems} />
              </div>

              <AdvancedPanel
                id="incomeParameters"
                title="Income parameters"
                open={state.incomeParametersOpen}
                onToggle={(open) => updateField("incomeParametersOpen", open)}
              >
                <div className="grid gap-4">
                  <NumberField
                    label="Employer match rate"
                    suffix="%"
                    min="0"
                    max="100"
                    step="1"
                    value={state.matchRate}
                    onValueChange={(value) => updateField("matchRate", value ?? 0)}
                  />
                </div>
              </AdvancedPanel>
            </>
          }
        >
          <Section
            title="Income"
            actions={
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={addSalaryItem}>Add salary</ActionButton>
                <ActionButton onClick={addRsuItem}>Add RSU</ActionButton>
              </div>
            }
          >
            <div className="grid gap-3">
              {state.incomeItems.map((item) => {
                if (item.type === "salary") {
                  const annualizedSalary = getAnnualSalaryTotal([
                    {
                      amount: item.amount ?? 0,
                      frequency: item.frequency,
                    },
                  ]);

                  return (
                    <RowItem
                      key={item.id}
                      headerClassName="grid gap-3 md:grid-cols-2"
                      removeLabel={`Remove ${item.name || "salary"}`}
                      onRemove={(event) => {
                        event.stopPropagation();
                        removeIncomeItem(item.id);
                      }}
                      detailsTitle="Salary details"
                      detailsSummary={renderIncomeSummary(item, annualizedSalary)}
                      detailsOpen={Boolean(item.detailsOpen)}
                      onToggleDetails={(open) => updateIncomeItem(item.id, { detailsOpen: open })}
                      header={
                        <>
                          <TextField
                            label="Income name"
                            value={item.name}
                            onChange={(event) =>
                              updateIncomeItem(item.id, {
                                name: event.target.value,
                              })
                            }
                          />
                          <NumberField
                            label="Amount"
                            prefix="$"
                            min="0"
                            step="1000"
                            value={item.amount}
                            onValueChange={(value) =>
                              updateIncomeItem(item.id, {
                                amount: value,
                              })
                            }
                          />
                        </>
                      }
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-1">
                          <span className={fieldLabelClass}>Frequency</span>
                          <SegmentedToggle
                            ariaLabel={`${item.name || "Salary"} frequency`}
                            value={item.frequency}
                            onChange={(frequency) => updateIncomeItem(item.id, { frequency })}
                            options={[
                              { value: "annual", label: "Annual" },
                              { value: "monthly", label: "Monthly" },
                            ]}
                          />
                        </div>
                      </div>
                    </RowItem>
                  );
                }

                return (
                  <RowItem
                    key={item.id}
                    headerClassName="grid gap-3 md:grid-cols-2"
                    removeLabel={`Remove ${item.name || "RSU grant"}`}
                    onRemove={(event) => {
                      event.stopPropagation();
                      removeIncomeItem(item.id);
                    }}
                    detailsTitle="RSU details"
                    detailsOpen={Boolean(item.detailsOpen)}
                    onToggleDetails={(open) => updateIncomeItem(item.id, { detailsOpen: open })}
                    header={
                      <>
                        <TextField
                          label="Income name"
                          value={item.name}
                          onChange={(event) =>
                            updateIncomeItem(item.id, {
                              name: event.target.value,
                            })
                          }
                        />
                        <NumberField
                          label="Unvested remaining"
                          prefix="$"
                          min="0"
                          step="1000"
                          value={item.grantAmount}
                          onValueChange={(value) =>
                            updateIncomeItem(item.id, {
                              grantAmount: value,
                            })
                          }
                        />
                      </>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <NumberField
                        label="Annual refresher"
                        prefix="$"
                        min="0"
                        step="1000"
                        value={item.refresherAmount}
                        onValueChange={(value) =>
                          updateIncomeItem(item.id, {
                            refresherAmount: value,
                          })
                        }
                      />
                      <NumberField
                        label="Years left to vest"
                        suffix="years"
                        min="1"
                        step="1"
                        value={item.vestingYears}
                        onValueChange={(value) =>
                          updateIncomeItem(item.id, {
                            vestingYears: value,
                          })
                        }
                      />
                    </div>
                  </RowItem>
                );
              })}
            </div>
          </Section>

          <Section title="Retirement Savings" divider>
            <div className="grid gap-4">
              <div
                className="grid gap-3 border-b border-(--line-soft) pb-4 md:grid-cols-[140px_minmax(0,1fr)]
                  md:items-start"
              >
                <div className="pt-1 text-sm text-(--ink-soft)">Traditional 401(k)</div>
                <SliderField
                  id="employee401k"
                  label="Employee contribution"
                  valueLabel={usd(inputs.employee401k)}
                  min="0"
                  max="24500"
                  step="50"
                  value={state.employee401k}
                  onChange={(event) => updateField("employee401k", Number(event.target.value))}
                />
              </div>

              <div
                className="grid gap-3 border-b border-(--line-soft) pb-4 md:grid-cols-[140px_minmax(0,1fr)]
                  md:items-start"
              >
                <div className="pt-1 text-sm text-(--ink-soft)">Roth 401(k)</div>
                <SliderField
                  id="megaBackdoor"
                  label="Mega backdoor"
                  valueLabel={usd(results.megaBackdoor)}
                  min="0"
                  max={Math.max(0, Math.round(results.availableMegaRoom))}
                  step="50"
                  value={Math.min(state.megaBackdoor, Math.max(0, Math.round(results.availableMegaRoom)))}
                  onChange={(event) => updateField("megaBackdoor", Number(event.target.value))}
                />
              </div>

              <div
                className="grid gap-3 border-b border-(--line-soft) pb-4 md:grid-cols-[140px_minmax(0,1fr)]
                  md:items-start"
              >
                <div className="pt-1 text-sm text-(--ink-soft)">IRA</div>
                <SliderField
                  id="iraContribution"
                  label="Annual contribution"
                  valueLabel={usd(inputs.iraContribution)}
                  min="0"
                  max="7000"
                  step="50"
                  value={state.iraContribution}
                  onChange={(event) => updateField("iraContribution", Number(event.target.value))}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
                <div className="pt-1 text-sm text-(--ink-soft)">HSA</div>
                <SliderField
                  id="hsaContribution"
                  label="Annual contribution"
                  valueLabel={usd(inputs.hsaContribution)}
                  min="0"
                  max="4400"
                  step="50"
                  value={state.hsaContribution}
                  onChange={(event) => updateField("hsaContribution", Number(event.target.value))}
                />
              </div>
            </div>
          </Section>

          <Section title="Contribution Breakdown" divider>
            <table>
              <tbody>
                {contributionRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{usd(value, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Tax Breakdown" divider>
            <table>
              <tbody>
                {taxRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{usd(value, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
