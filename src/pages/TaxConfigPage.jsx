import React, { useMemo, useState } from "react";
import { ActionButton } from "../components/ActionButton";
import { Section } from "../components/Section";
import { TextAreaField } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { loadTaxConfig, resetTaxConfig, saveTaxConfig } from "../lib/taxConfig";
import { surfaceClass } from "../lib/ui";

export function TaxConfigPage() {
  const initialConfig = useMemo(() => loadTaxConfig(), []);
  const [federalBrackets, setFederalBrackets] = useState(
    JSON.stringify(initialConfig.federalBrackets, null, 2),
  );
  const [stateBrackets, setStateBrackets] = useState(
    JSON.stringify(initialConfig.stateBrackets, null, 2),
  );
  const [longTermCapitalGains, setLongTermCapitalGains] = useState(
    JSON.stringify(initialConfig.longTermCapitalGains, null, 2),
  );
  const [status, setStatus] = useState("");

  function applyConfig(config) {
    setFederalBrackets(JSON.stringify(config.federalBrackets, null, 2));
    setStateBrackets(JSON.stringify(config.stateBrackets, null, 2));
    setLongTermCapitalGains(
      JSON.stringify(config.longTermCapitalGains, null, 2),
    );
  }

  function handleApply() {
    try {
      const config = saveTaxConfig({
        federalBrackets: JSON.parse(federalBrackets),
        stateBrackets: JSON.parse(stateBrackets),
        longTermCapitalGains: JSON.parse(longTermCapitalGains),
      });
      applyConfig(config);
      setStatus("Saved to local storage.");
    } catch (error) {
      setStatus(`Config error: ${error.message}`);
    }
  }

  function handleReset() {
    const config = resetTaxConfig();
    applyConfig(config);
    setStatus("Reset to 2026 defaults.");
  }

  return (
    <PageShell
      actions={
        <ActionButton onClick={handleReset}>
          Reset
        </ActionButton>
      }
    >
      <main className={surfaceClass}>
        <section className="p-6 max-sm:p-4">
          <Section title="Tax Config">
            <p className="leading-relaxed text-(--ink-soft)">
              Each array is saved to local storage and reused across the suite,
              including income, assets, and projection. Use <code>null</code>{" "}
              for the top bracket.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <TextAreaField
                label="Federal brackets"
                htmlFor="federalBrackets"
                value={federalBrackets}
                onChange={(event) => setFederalBrackets(event.target.value)}
              />
              <TextAreaField
                label="State brackets"
                htmlFor="stateBrackets"
                value={stateBrackets}
                onChange={(event) => setStateBrackets(event.target.value)}
              />
              <TextAreaField
                label="Long-term capital gains"
                htmlFor="longTermCapitalGains"
                value={longTermCapitalGains}
                onChange={(event) =>
                  setLongTermCapitalGains(event.target.value)
                }
              />
            </div>
            <div className="mt-4 flex gap-2.5">
              <ActionButton onClick={handleApply}>
                Apply config
              </ActionButton>
            </div>
            <div
              className="mt-4 min-h-6 leading-relaxed text-(--ink-soft)"
              aria-live="polite"
            >
              {status}
            </div>
          </Section>
        </section>
      </main>
    </PageShell>
  );
}
