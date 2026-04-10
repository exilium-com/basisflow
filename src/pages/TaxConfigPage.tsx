import React, { useState } from "react";
import { ActionButton } from "../components/ActionButton";
import { NumberField, SelectField, TextAreaField } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { Section } from "../components/Section";
import { loadTaxConfig, saveTaxConfig, type TaxConfig } from "../lib/taxConfig";
import { surfaceClass } from "../lib/ui";

export function TaxConfigPage() {
  const initialConfig = loadTaxConfig();
  const [federalBrackets, setFederalBrackets] = useState(JSON.stringify(initialConfig.federalBrackets, null, 2));
  const [annualAdditionsLimit, setAnnualAdditionsLimit] = useState(String(initialConfig.annualAdditionsLimit));
  const [deductionMode, setDeductionMode] = useState(initialConfig.deductionMode);
  const [federalStandardDeduction, setFederalStandardDeduction] = useState(
    String(initialConfig.federalStandardDeduction),
  );
  const [stateStandardDeduction, setStateStandardDeduction] = useState(String(initialConfig.stateStandardDeduction));
  const [federalSaltCap, setFederalSaltCap] = useState(String(initialConfig.federalSaltCap));
  const [caSdiRate, setCaSdiRate] = useState(String(initialConfig.caSdiRate));
  const [stateBrackets, setStateBrackets] = useState(JSON.stringify(initialConfig.stateBrackets, null, 2));
  const [longTermCapitalGains, setLongTermCapitalGains] = useState(
    JSON.stringify(initialConfig.longTermCapitalGains, null, 2),
  );
  const [status, setStatus] = useState("");

  function applyConfig(config: TaxConfig) {
    setAnnualAdditionsLimit(String(config.annualAdditionsLimit));
    setDeductionMode(config.deductionMode);
    setFederalStandardDeduction(String(config.federalStandardDeduction));
    setStateStandardDeduction(String(config.stateStandardDeduction));
    setFederalSaltCap(String(config.federalSaltCap));
    setCaSdiRate(String(config.caSdiRate));
    setFederalBrackets(JSON.stringify(config.federalBrackets, null, 2));
    setStateBrackets(JSON.stringify(config.stateBrackets, null, 2));
    setLongTermCapitalGains(JSON.stringify(config.longTermCapitalGains, null, 2));
  }

  function handleApply() {
    try {
      const config = saveTaxConfig({
        annualAdditionsLimit: Number(annualAdditionsLimit),
        deductionMode,
        federalStandardDeduction: Number(federalStandardDeduction),
        stateStandardDeduction: Number(stateStandardDeduction),
        federalSaltCap: Number(federalSaltCap),
        caSdiRate: Number(caSdiRate),
        federalBrackets: JSON.parse(federalBrackets),
        stateBrackets: JSON.parse(stateBrackets),
        longTermCapitalGains: JSON.parse(longTermCapitalGains),
      });
      applyConfig(config);
      setStatus("Saved to local storage.");
    } catch (error) {
      setStatus(`Config error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return (
    <PageShell>
      <main className={surfaceClass}>
        <section className="p-6 max-sm:p-4">
          <Section title="Tax Config">
            <p className="leading-relaxed text-(--ink-soft)">
              Each array is saved to local storage and reused across the suite, including income, assets, and
              projection. Use <code>null</code> for the top bracket.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <NumberField
                label="401(k) annual additions limit"
                prefix="$"
                min="0"
                step="100"
                value={annualAdditionsLimit}
                onChange={(event) => setAnnualAdditionsLimit(event.target.value)}
              />
              <SelectField
                label="Deduction mode"
                value={deductionMode}
                onChange={(event) => setDeductionMode(event.target.value as TaxConfig["deductionMode"])}
              >
                <option value="standard">Standard deduction</option>
                <option value="itemized">Itemized deductions</option>
              </SelectField>
              <NumberField
                label="Federal standard deduction"
                prefix="$"
                min="0"
                step="50"
                value={federalStandardDeduction}
                onChange={(event) => setFederalStandardDeduction(event.target.value)}
              />
              <NumberField
                label="California standard deduction"
                prefix="$"
                min="0"
                step="50"
                value={stateStandardDeduction}
                onChange={(event) => setStateStandardDeduction(event.target.value)}
              />
              <NumberField
                label="Federal SALT cap"
                prefix="$"
                min="0"
                step="50"
                value={federalSaltCap}
                onChange={(event) => setFederalSaltCap(event.target.value)}
              />
              <NumberField
                label="CA SDI rate"
                suffix="%"
                min="0"
                step="0.1"
                value={caSdiRate}
                onChange={(event) => setCaSdiRate(event.target.value)}
              />
              <TextAreaField
                label="Federal brackets"
                value={federalBrackets}
                onChange={(event) => setFederalBrackets(event.target.value)}
              />
              <TextAreaField
                label="State brackets"
                value={stateBrackets}
                onChange={(event) => setStateBrackets(event.target.value)}
              />
              <TextAreaField
                label="Long-term capital gains"
                value={longTermCapitalGains}
                onChange={(event) => setLongTermCapitalGains(event.target.value)}
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-(--ink-soft)">
              When itemized deductions are selected, mortgage interest and property tax come from the mortgage
              calculation, and federal SALT also includes the calculated California income tax capped by the federal
              SALT cap above. California itemized deductions use mortgage interest plus property tax.
            </p>
            <div className="mt-4 flex gap-2.5">
              <ActionButton onClick={handleApply}>Apply config</ActionButton>
            </div>
            <div className="mt-4 min-h-6 leading-relaxed text-(--ink-soft)" aria-live="polite">
              {status}
            </div>
          </Section>
        </section>
      </main>
    </PageShell>
  );
}
