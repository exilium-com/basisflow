import React, { useEffect, useMemo } from "react";
import { ActionButton } from "../components/ActionButton";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { MetricGrid } from "../components/MetricGrid";
import {
  NumberField,
  TextField,
  fieldLabelClass,
} from "../components/Field";
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
  calculateIncome,
  computeRsuGrossForItems,
  getAnnualSalaryTotal,
} from "../lib/incomeModel";
import { loadStoredJson, saveJson } from "../lib/storage";
import { loadTaxConfig } from "../lib/taxConfig";
import {
  normalizeAssetsState,
  PINNED_RETIREMENT_BUCKETS,
} from "../lib/assetsModel";
import { INCOME_STATE_KEY, INCOME_SUMMARY_KEY } from "../lib/storageKeys";
import { surfaceClass } from "../lib/ui";

function createSalaryItem(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    type: "salary",
    name: "Salary",
    amount: "255000",
    frequency: "annual",
    detailsOpen: false,
    ...overrides,
  };
}

function createRsuItem(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    type: "rsu",
    name: "RSU grant",
    grantAmount: "0",
    refresherAmount: "0",
    vestingYears: "4",
    detailsOpen: false,
    ...overrides,
  };
}

const DEFAULTS = {
  incomeItems: [createSalaryItem()],
  employee401k: "24500",
  matchRate: "50",
  iraContribution: "7000",
  megaBackdoorInput: "35250",
  hsaContribution: "4400",
  incomeParametersOpen: false,
};

function normalizeIncomeItem(item) {
  if (item?.type === "rsu") {
    return createRsuItem({
      id: typeof item?.id === "string" ? item.id : crypto.randomUUID(),
      name: typeof item?.name === "string" ? item.name : "RSU grant",
      grantAmount:
        typeof item?.grantAmount === "string" ? item.grantAmount : "0",
      refresherAmount:
        typeof item?.refresherAmount === "string" ? item.refresherAmount : "0",
      vestingYears:
        typeof item?.vestingYears === "string" ? item.vestingYears : "4",
      detailsOpen: Boolean(item?.detailsOpen),
    });
  }

  return createSalaryItem({
    id: typeof item?.id === "string" ? item.id : crypto.randomUUID(),
    name: typeof item?.name === "string" ? item.name : "Salary",
    amount: typeof item?.amount === "string" ? item.amount : "0",
    frequency: item?.frequency === "monthly" ? "monthly" : "annual",
    detailsOpen: Boolean(item?.detailsOpen),
  });
}

function normalizeState(parsed, fallback) {
  const hasDynamicItems =
    Array.isArray(parsed?.incomeItems) && parsed.incomeItems.length > 0;
  const migratedItems = hasDynamicItems
    ? parsed.incomeItems.map((item) => normalizeIncomeItem(item))
    : [
        createSalaryItem({
          amount:
            typeof parsed?.grossSalary === "string"
              ? parsed.grossSalary
              : fallback.incomeItems[0].amount,
        }),
      ];

  const legacyRsuGrantAmount =
    typeof parsed?.rsuGrantAmount === "string" ? parsed.rsuGrantAmount : "0";
  const legacyRsuRefresherAmount =
    typeof parsed?.rsuRefresherAmount === "string"
      ? parsed.rsuRefresherAmount
      : "0";
  const shouldMigrateLegacyRsu =
    !hasDynamicItems &&
    (readNumber(legacyRsuGrantAmount, 0) > 0 ||
      readNumber(legacyRsuRefresherAmount, 0) > 0);

  return {
    incomeItems: shouldMigrateLegacyRsu
      ? [
          ...migratedItems,
          createRsuItem({
            grantAmount: legacyRsuGrantAmount,
            refresherAmount: legacyRsuRefresherAmount,
            vestingYears:
              typeof parsed?.rsuVestingYears === "string"
                ? parsed.rsuVestingYears
                : "4",
          }),
        ]
      : migratedItems,
    employee401k:
      typeof parsed?.employee401k === "string"
        ? parsed.employee401k
        : fallback.employee401k,
    matchRate:
      typeof parsed?.matchRate === "string"
        ? parsed.matchRate
        : fallback.matchRate,
    iraContribution:
      typeof parsed?.iraContribution === "string"
        ? parsed.iraContribution
        : fallback.iraContribution,
    megaBackdoorInput:
      typeof parsed?.megaBackdoorInput === "string"
        ? parsed.megaBackdoorInput
        : fallback.megaBackdoorInput,
    hsaContribution:
      typeof parsed?.hsaContribution === "string"
        ? parsed.hsaContribution
        : fallback.hsaContribution,
    incomeParametersOpen: Boolean(parsed?.incomeParametersOpen),
  };
}

function renderIncomeSummary(item, annualizedSalary) {
  if (item.type === "salary") {
    return item.frequency === "monthly"
      ? `${usd(annualizedSalary)} / year`
      : "Annual";
  }

  const vestYears = Math.max(1, Math.round(readNumber(item.vestingYears, 4)));
  return `${vestYears} year vest`;
}

export function IncomePage() {
  const [state, setState] = useStoredState(INCOME_STATE_KEY, DEFAULTS, {
    normalize: normalizeState,
    localStorage: true,
    preferLocalStorage: true,
  });

  const salaryItems = useMemo(
    () =>
      state.incomeItems
        .filter((item) => item.type === "salary")
        .map((item) => ({
          id: item.id,
          name: item.name,
          amount: readNumber(item.amount, 0),
          frequency: item.frequency === "monthly" ? "monthly" : "annual",
        })),
    [state.incomeItems],
  );
  const rsuItems = useMemo(
    () =>
      state.incomeItems
        .filter((item) => item.type === "rsu")
        .map((item) => ({
          id: item.id,
          name: item.name,
          grantAmount: readNumber(item.grantAmount, 0),
          refresherAmount: readNumber(item.refresherAmount, 0),
          vestingYears: readNumber(item.vestingYears, 4),
        })),
    [state.incomeItems],
  );
  const inputs = useMemo(
    () => ({
      grossSalary: getAnnualSalaryTotal(salaryItems),
      rsuGrossNextYear: computeRsuGrossForItems(rsuItems, 0),
      employee401k: readNumber(state.employee401k, 0),
      matchRate: readNumber(state.matchRate, 0),
      iraContribution: readNumber(state.iraContribution, 0),
      megaBackdoorInput: readNumber(state.megaBackdoorInput, 0),
      hsaContribution: readNumber(state.hsaContribution, 0),
      rsuItems,
    }),
    [salaryItems, rsuItems, state],
  );
  const taxConfig = useMemo(() => loadTaxConfig(), []);
  const results = useMemo(
    () => calculateIncome(inputs, taxConfig),
    [inputs, taxConfig],
  );

  useEffect(() => {
    saveJson(INCOME_SUMMARY_KEY, {
      grossSalary: results.grossSalary,
      annualTakeHome: results.annualTakeHome,
      monthlyTakeHome: results.monthlyTakeHome,
      federalTax: results.federalTax,
      californiaTax: results.californiaTax,
      socialSecurityTax: results.fica.socialSecurity,
      medicareTax: results.fica.medicare,
      additionalMedicareTax: results.fica.additionalMedicare,
      caSdi: results.caSdi,
      totalTaxes: results.totalTaxes,
      employee401k: inputs.employee401k,
      employerMatch: results.employerMatch,
      iraContribution: inputs.iraContribution,
      megaBackdoor: results.mega,
      hsaContribution: inputs.hsaContribution,
      matchRate: inputs.matchRate,
      rsuItems: inputs.rsuItems,
      rsuGrossNextYear: results.rsuGrossNextYear,
      rsuNetNextYear: results.rsuNetNextYear,
    });
  }, [inputs, results]);

  function updateField(field, value) {
    setState((current) => ({ ...current, [field]: value }));
  }

  function updateIncomeItem(itemId, patch) {
    setState((current) => ({
      ...current,
      incomeItems: current.incomeItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function removeIncomeItem(itemId) {
    setState((current) => ({
      ...current,
      incomeItems: current.incomeItems.filter((item) => item.id !== itemId),
    }));
  }

  function addSalaryItem() {
    setState((current) => ({
      ...current,
      incomeItems: [...current.incomeItems, createSalaryItem({ amount: "" })],
    }));
  }

  function addRsuItem() {
    setState((current) => ({
      ...current,
      incomeItems: [...current.incomeItems, createRsuItem()],
    }));
  }

  function reset() {
    setState({
      ...DEFAULTS,
      incomeItems: [createSalaryItem()],
    });
  }

  const contributionRows = [
    ["Employee 401(k)", inputs.employee401k],
    ["Employer match", results.employerMatch],
    ["IRA", inputs.iraContribution],
    ["Mega backdoor after-tax", results.mega],
    ["HSA", inputs.hsaContribution],
  ];

  const taxRows = [
    ["Federal income tax", results.federalTax],
    ["California income tax", results.californiaTax],
    ["Social Security", results.fica.socialSecurity],
    ["Medicare", results.fica.medicare],
    ["Additional Medicare", results.fica.additionalMedicare],
    ["CA SDI", results.caSdi],
  ];

  return (
    <PageShell actions={<ActionButton onClick={reset}>Reset</ActionButton>}>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip
                kicker="Estimated Annual Take-Home"
                value={usd(results.annualTakeHome, 2)}
              />

              <div className="mt-6">
                <MetricGrid
                  items={[
                    {
                      label: "Annual salary",
                      value: usd(results.grossSalary, 2),
                    },
                    {
                      label: "Monthly take-home",
                      value: usd(results.monthlyTakeHome, 2),
                    },
                    {
                      label: "Next 12m RSU gross",
                      value: usd(results.rsuGrossNextYear, 2),
                    },
                    {
                      label: "Next 12m RSU net",
                      value: usd(results.rsuNetNextYear, 2),
                    },
                    {
                      label: "Retirement saving",
                      value: usd(
                        inputs.employee401k +
                          results.employerMatch +
                          inputs.iraContribution +
                          results.mega,
                        2,
                      ),
                    },
                    {
                      label: "Total taxes",
                      value: usd(results.totalTaxes, 2),
                    },
                    {
                      label: "Federal tax",
                      value: usd(results.federalTax, 2),
                    },
                    {
                      label: "California tax",
                      value: usd(results.californiaTax, 2),
                    },
                    {
                      label: "FICA",
                      value: usd(results.fica.total, 2),
                    },
                    {
                      label: "CA SDI",
                      value: usd(results.caSdi, 2),
                    },
                  ]}
                />
              </div>

              <AdvancedPanel
                id="incomeParameters"
                title="Income parameters"
                open={state.incomeParametersOpen}
                onToggle={(open) =>
                  updateField("incomeParametersOpen", open)
                }
              >
                <div className="grid gap-4">
                  <NumberField
                    label="Employer match rate"
                    suffix="%"
                    min="0"
                    max="100"
                    step="1"
                    value={state.matchRate}
                    onChange={(event) =>
                      updateField("matchRate", event.target.value)
                    }
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
                      amount: readNumber(item.amount, 0),
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
                      detailsSummary={renderIncomeSummary(
                        item,
                        annualizedSalary,
                      )}
                      detailsOpen={Boolean(item.detailsOpen)}
                      onToggleDetails={(open) =>
                        updateIncomeItem(item.id, { detailsOpen: open })
                      }
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
                            onChange={(event) =>
                              updateIncomeItem(item.id, {
                                amount: event.target.value,
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
                            onChange={(frequency) =>
                              updateIncomeItem(item.id, { frequency })
                            }
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
                    onToggleDetails={(open) =>
                      updateIncomeItem(item.id, { detailsOpen: open })
                    }
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
                          onChange={(event) =>
                            updateIncomeItem(item.id, {
                              grantAmount: event.target.value,
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
                        onChange={(event) =>
                          updateIncomeItem(item.id, {
                            refresherAmount: event.target.value,
                          })
                        }
                      />
                      <NumberField
                        label="Years left to vest"
                        suffix="years"
                        min="1"
                        step="1"
                        value={item.vestingYears}
                        onChange={(event) =>
                          updateIncomeItem(item.id, {
                            vestingYears: event.target.value,
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
                <div className="grid gap-3 border-b border-(--line-soft) pb-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
                  <div className="pt-1 text-sm text-(--ink-soft)">
                    Traditional 401(k)
                  </div>
                <SliderField
                  id="employee401k"
                  label="Employee contribution"
                  valueLabel={usd(inputs.employee401k)}
                  min="0"
                  max="24500"
                  step="50"
                  value={state.employee401k}
                  onChange={(event) =>
                    updateField("employee401k", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-3 border-b border-(--line-soft) pb-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
                <div className="pt-1 text-sm text-(--ink-soft)">Roth 401(k)</div>
                <SliderField
                  id="megaBackdoorInput"
                  label="Mega backdoor"
                  valueLabel={usd(results.mega)}
                  min="0"
                  max={Math.max(0, Math.round(results.availableMegaRoom))}
                  step="50"
                  value={Math.min(
                    readNumber(state.megaBackdoorInput, 0),
                    Math.max(0, Math.round(results.availableMegaRoom)),
                  )}
                  onChange={(event) =>
                    updateField("megaBackdoorInput", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-3 border-b border-(--line-soft) pb-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
                <div className="pt-1 text-sm text-(--ink-soft)">IRA</div>
                <SliderField
                  id="iraContribution"
                  label="Annual contribution"
                  valueLabel={usd(inputs.iraContribution)}
                  min="0"
                  max="7000"
                  step="50"
                  value={state.iraContribution}
                  onChange={(event) =>
                    updateField("iraContribution", event.target.value)
                  }
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
                  onChange={(event) =>
                    updateField("hsaContribution", event.target.value)
                  }
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
