import React, { useEffect, useMemo } from "react";
import { ActionButton } from "../components/ActionButton";
import { PageShell } from "../components/PageShell";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { MetricGrid } from "../components/MetricGrid";
import { Section } from "../components/Section";
import { NumberField, SelectField } from "../components/Field";
import { SliderField } from "../components/SliderField";
import { useStoredState } from "../hooks/useStoredState";
import { clamp, readNumber, usd } from "../lib/format";
import { saveJson } from "../lib/storage";
import { computeProgressiveTax, loadTaxConfig } from "../lib/taxConfig";
import { INCOME_STATE_KEY, INCOME_SUMMARY_KEY } from "../lib/storageKeys";
import { pageSectionClass, surfaceClass } from "../lib/ui";

const DEFAULTS = {
  grossSalary: "255000",
  employee401k: "24500",
  annualAdditions: "72000",
  matchRate: "50",
  megaBackdoorInput: "35250",
  hsaContribution: "4400",
  federalStandardDeduction: "16100",
  caStandardDeduction: "5706",
  caSdiRate: "1.3",
  includeCaSdi: "yes",
  taxAssumptionsOpen: false,
};

function normalizeState(parsed, fallback) {
  return {
    grossSalary:
      typeof parsed?.grossSalary === "string"
        ? parsed.grossSalary
        : fallback.grossSalary,
    employee401k:
      typeof parsed?.employee401k === "string"
        ? parsed.employee401k
        : fallback.employee401k,
    annualAdditions:
      typeof parsed?.annualAdditions === "string"
        ? parsed.annualAdditions
        : fallback.annualAdditions,
    matchRate:
      typeof parsed?.matchRate === "string"
        ? parsed.matchRate
        : fallback.matchRate,
    megaBackdoorInput:
      typeof parsed?.megaBackdoorInput === "string"
        ? parsed.megaBackdoorInput
        : fallback.megaBackdoorInput,
    hsaContribution:
      typeof parsed?.hsaContribution === "string"
        ? parsed.hsaContribution
        : fallback.hsaContribution,
    federalStandardDeduction:
      typeof parsed?.federalStandardDeduction === "string"
        ? parsed.federalStandardDeduction
        : fallback.federalStandardDeduction,
    caStandardDeduction:
      typeof parsed?.caStandardDeduction === "string"
        ? parsed.caStandardDeduction
        : fallback.caStandardDeduction,
    caSdiRate:
      typeof parsed?.caSdiRate === "string"
        ? parsed.caSdiRate
        : fallback.caSdiRate,
    includeCaSdi: parsed?.includeCaSdi === "no" ? "no" : "yes",
    taxAssumptionsOpen: Boolean(parsed?.taxAssumptionsOpen),
  };
}

function computeFederalTax(taxableIncome) {
  return computeProgressiveTax(taxableIncome, loadTaxConfig().federalBrackets);
}

function computeCaliforniaTax(taxableIncome) {
  return computeProgressiveTax(taxableIncome, loadTaxConfig().stateBrackets);
}

function computeFica(grossSalary, hsaPayrollAmount) {
  const ficaWages = Math.max(0, grossSalary - hsaPayrollAmount);
  const socialSecurityWageBase = 184500;
  const socialSecurity = Math.min(ficaWages, socialSecurityWageBase) * 0.062;
  const medicare = ficaWages * 0.0145;
  const additionalMedicare = Math.max(0, ficaWages - 200000) * 0.009;

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare,
  };
}

function computeSavings(inputs) {
  const matchRate = clamp(inputs.matchRate / 100, 0, 5);
  const employee401k = Math.max(0, inputs.employee401k);
  const annualAdditions = Math.max(0, inputs.annualAdditions);
  const employerMatch = employee401k * matchRate;
  const availableMegaRoom = Math.max(
    0,
    annualAdditions - employee401k - employerMatch,
  );
  const mega = clamp(
    Math.max(0, inputs.megaBackdoorInput),
    0,
    availableMegaRoom,
  );

  return {
    employerMatch,
    mega,
    availableMegaRoom,
  };
}

function calculate(inputs) {
  const savings = computeSavings(inputs);
  const federalAdjustedGross = Math.max(
    0,
    inputs.grossSalary - inputs.employee401k - inputs.hsaContribution,
  );
  const federalTaxableIncome = Math.max(
    0,
    federalAdjustedGross - inputs.federalStandardDeduction,
  );
  const federalTax = computeFederalTax(federalTaxableIncome);

  const californiaAdjustedGross = Math.max(
    0,
    inputs.grossSalary - inputs.employee401k,
  );
  const californiaTaxableIncome = Math.max(
    0,
    californiaAdjustedGross - inputs.caStandardDeduction,
  );
  const californiaTax = computeCaliforniaTax(californiaTaxableIncome);

  const fica = computeFica(inputs.grossSalary, inputs.hsaContribution);
  const caSdi = inputs.includeCaSdi ? inputs.grossSalary * inputs.caSdiRate : 0;
  const totalTaxes = federalTax + californiaTax + fica.total + caSdi;

  const annualTakeHome =
    inputs.grossSalary -
    inputs.employee401k -
    inputs.hsaContribution -
    savings.mega -
    totalTaxes;

  return {
    ...savings,
    federalTax,
    californiaTax,
    fica,
    caSdi,
    totalTaxes,
    annualTakeHome,
    monthlyTakeHome: annualTakeHome / 12,
  };
}

export function IncomePage() {
  const [state, setState] = useStoredState(INCOME_STATE_KEY, DEFAULTS, {
    normalize: normalizeState,
    localStorage: true,
    preferLocalStorage: true,
  });

  const inputs = useMemo(
    () => ({
      grossSalary: readNumber(state.grossSalary, 0),
      employee401k: readNumber(state.employee401k, 0),
      annualAdditions: readNumber(state.annualAdditions, 0),
      matchRate: readNumber(state.matchRate, 0),
      megaBackdoorInput: readNumber(state.megaBackdoorInput, 0),
      hsaContribution: readNumber(state.hsaContribution, 0),
      federalStandardDeduction: readNumber(state.federalStandardDeduction, 0),
      caStandardDeduction: readNumber(state.caStandardDeduction, 0),
      caSdiRate: readNumber(state.caSdiRate, 0) / 100,
      includeCaSdi: state.includeCaSdi === "yes",
    }),
    [state],
  );

  const results = useMemo(() => calculate(inputs), [inputs]);

  useEffect(() => {
    saveJson(INCOME_SUMMARY_KEY, {
      grossSalary: inputs.grossSalary,
      annualTakeHome: results.annualTakeHome,
      monthlyTakeHome: results.monthlyTakeHome,
      totalTaxes: results.totalTaxes,
      employee401k: inputs.employee401k,
      employerMatch: results.employerMatch,
      megaBackdoor: results.mega,
      hsaContribution: inputs.hsaContribution,
    });
  }, [inputs, results]);

  function updateField(field, value) {
    setState((current) => ({ ...current, [field]: value }));
  }

  function reset() {
    setState({ ...DEFAULTS });
  }

  const contributionRows = [
    ["Employee 401(k)", inputs.employee401k],
    ["Employer match", results.employerMatch],
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
    <PageShell
      actions={
        <ActionButton onClick={reset}>
          Reset
        </ActionButton>
      }
    >
      <main className={surfaceClass}>
        <section className={pageSectionClass}>
          <Section title="Income">
            <div className="grid gap-4">
              <NumberField
                label="Gross salary"
                htmlFor="grossSalary"
                prefix="$"
                min="0"
                step="1000"
                value={state.grossSalary}
                onChange={(event) =>
                  updateField("grossSalary", event.target.value)
                }
              />
            </div>
          </Section>

          <Section title="Retirement Savings" divider>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <SliderField
                id="employee401k"
                label="Employee 401(k)"
                valueLabel={usd(inputs.employee401k)}
                min="0"
                max="24500"
                step="100"
                value={state.employee401k}
                onChange={(event) =>
                  updateField("employee401k", event.target.value)
                }
              />
              <SliderField
                id="matchRate"
                label="Employer match rate"
                valueLabel={`${Math.round(inputs.matchRate)}%`}
                min="0"
                max="100"
                step="1"
                value={state.matchRate}
                onChange={(event) =>
                  updateField("matchRate", event.target.value)
                }
              />
              <SliderField
                id="megaBackdoorInput"
                label="Mega backdoor amount"
                valueLabel={usd(results.mega)}
                min="0"
                max={Math.max(0, Math.round(results.availableMegaRoom))}
                step="100"
                value={Math.min(
                  readNumber(state.megaBackdoorInput, 0),
                  Math.max(0, Math.round(results.availableMegaRoom)),
                )}
                onChange={(event) =>
                  updateField("megaBackdoorInput", event.target.value)
                }
              />
              <SliderField
                id="hsaContribution"
                label="HSA contribution"
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
          </Section>

          <div className="mt-3">
            <div className="grid gap-1 pb-4">
              <span className="text-sm uppercase tracking-wide text-(--ink-soft)">
                Estimated Annual Take-Home
              </span>
              <strong className="text-4xl leading-none tracking-tight md:text-5xl">
                {usd(results.annualTakeHome, 2)}
              </strong>
            </div>

            <MetricGrid
              items={[
                {
                  label: "Monthly take-home",
                  value: usd(results.monthlyTakeHome, 2),
                },
                { label: "Mega backdoor amount", value: usd(results.mega) },
                { label: "Employer match", value: usd(results.employerMatch) },
                { label: "Total taxes", value: usd(results.totalTaxes) },
              ]}
            />
          </div>

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

          <AdvancedPanel
            id="taxAssumptions"
            title="Tax Assumptions"
            open={state.taxAssumptionsOpen}
            onToggle={(open) => updateField("taxAssumptionsOpen", open)}
          >
            <div className="grid">
              <NumberField
                label="401(k) annual additions limit"
                htmlFor="annualAdditions"
                prefix="$"
                min="0"
                step="100"
                value={state.annualAdditions}
                onChange={(event) =>
                  updateField("annualAdditions", event.target.value)
                }
              />
              <NumberField
                label="Federal standard deduction"
                htmlFor="federalStandardDeduction"
                prefix="$"
                min="0"
                step="50"
                value={state.federalStandardDeduction}
                onChange={(event) =>
                  updateField("federalStandardDeduction", event.target.value)
                }
              />
              <NumberField
                label="California standard deduction"
                htmlFor="caStandardDeduction"
                prefix="$"
                min="0"
                step="50"
                value={state.caStandardDeduction}
                onChange={(event) =>
                  updateField("caStandardDeduction", event.target.value)
                }
              />
              <NumberField
                label="CA SDI rate"
                htmlFor="caSdiRate"
                suffix="%"
                min="0"
                max="10"
                step="0.1"
                value={state.caSdiRate}
                onChange={(event) =>
                  updateField("caSdiRate", event.target.value)
                }
              />
              <SelectField
                label="CA SDI"
                htmlFor="includeCaSdi"
                value={state.includeCaSdi}
                onChange={(event) =>
                  updateField("includeCaSdi", event.target.value)
                }
              >
                <option value="yes">Include</option>
                <option value="no">Ignore</option>
              </SelectField>
            </div>
          </AdvancedPanel>
        </section>
      </main>
    </PageShell>
  );
}
