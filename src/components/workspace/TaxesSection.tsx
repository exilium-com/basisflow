import React from "react";
import { AdvancedPanel } from "../AdvancedPanel";
import { ActionButton } from "../ActionButton";
import { NumberField, TextAreaField } from "../Field";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceMetricSplit } from "./WorkspaceMetricSplit";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import { type IncomeResults, type ResolvedIncome } from "../../lib/incomeModel";
import { type MortgageState } from "../../lib/mortgageConfig";
import type { DraftStateSetter } from "../../lib/state";
import { type TaxConfig } from "../../lib/taxConfig";
import { labelTextClass, smallCapsTextClass } from "../../lib/text";

type TaxesSectionProps = {
  federalBrackets: string;
  income: ResolvedIncome;
  incomeResults: IncomeResults;
  longTermCapitalGains: string;
  mortgageState: MortgageState;
  stateBrackets: string;
  taxConfig: TaxConfig;
  taxEditorStatus: string;
  onApplyTaxTables: () => void;
  onSetFederalBrackets: (value: string) => void;
  onSetLongTermCapitalGains: (value: string) => void;
  onSetStateBrackets: (value: string) => void;
  setMortgageState: DraftStateSetter<MortgageState>;
  onUpdateTaxConfig: (patch: Partial<TaxConfig>) => void;
};

type TaxFieldGroupProps = {
  title: string;
  divided?: boolean;
  children: React.ReactNode;
};

function TaxFieldGroup({ title, divided = false, children }: TaxFieldGroupProps) {
  return (
    <section className={divided ? "grid gap-4 border-t border-(--line-soft) pt-4" : "grid gap-4"}>
      <div className={smallCapsTextClass}>{title}</div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function TaxesSection({
  federalBrackets,
  income,
  incomeResults,
  longTermCapitalGains,
  mortgageState,
  stateBrackets,
  taxConfig,
  taxEditorStatus,
  onApplyTaxTables,
  onSetFederalBrackets,
  onSetLongTermCapitalGains,
  onSetStateBrackets,
  setMortgageState,
  onUpdateTaxConfig,
}: TaxesSectionProps) {
  const totalTaxWithProperty = incomeResults.totalTaxes + income.propertyTax;

  return (
    <WorkspaceSection id="taxes" index="03" title="Taxes" summary="Deduction Logic">
      <WorkspaceMetricSplit
        metrics={{
          primaryItem: { label: "Total tax", value: usd(totalTaxWithProperty) },
          items: [
            { label: "Federal tax", value: usd(incomeResults.federalTax) },
            { label: "California tax", value: usd(incomeResults.californiaTax) },
            { label: "FICA + CA SDI", value: usd(incomeResults.fica.total + incomeResults.caSdi) },
            { label: "Property tax", value: usd(income.propertyTax) },
          ],
        }}
      >
        <SegmentedToggle
          label="Deduction mode"
          ariaLabel="Deduction mode"
          className="w-fit"
          value={taxConfig.deductionMode}
          onChange={(deductionMode) => onUpdateTaxConfig({ deductionMode })}
          options={[
            { value: "standard", label: "Standard" },
            { value: "itemized", label: "Itemized" },
          ]}
        />
        <AdvancedPanel id="taxLimits" title="Tax parameters">
          <div className="grid gap-4">
            <TaxFieldGroup title="Tax Rates">
              <NumberField
                label="CA SDI"
                suffix="%"
                step="0.5"
                value={taxConfig.caSdiRate}
                onValueChange={(value) => onUpdateTaxConfig({ caSdiRate: value ?? 0 })}
              />
              <NumberField
                label="Property tax"
                suffix="%"
                value={mortgageState.propertyTaxRate}
                step="0.1"
                onValueChange={(value) =>
                  setMortgageState((draft) => {
                    draft.propertyTaxRate = value ?? 0;
                  })
                }
              />
            </TaxFieldGroup>
            <TaxFieldGroup title="Contribution Limits" divided>
              <NumberField
                label="Employee 401(k)"
                prefix="$"
                step="100"
                value={taxConfig.employee401kLimit}
                onValueChange={(value) => onUpdateTaxConfig({ employee401kLimit: value ?? 0 })}
              />
              <NumberField
                label="HSA"
                prefix="$"
                step="100"
                value={taxConfig.hsaContributionLimit}
                onValueChange={(value) => onUpdateTaxConfig({ hsaContributionLimit: value ?? 0 })}
              />
              <NumberField
                label="IRA"
                prefix="$"
                step="100"
                value={taxConfig.iraContributionLimit}
                onValueChange={(value) => onUpdateTaxConfig({ iraContributionLimit: value ?? 0 })}
              />
              <NumberField
                label="401(k) total"
                prefix="$"
                step="100"
                value={taxConfig.annualAdditionsLimit}
                onValueChange={(value) => onUpdateTaxConfig({ annualAdditionsLimit: value ?? 0 })}
              />
            </TaxFieldGroup>
            <TaxFieldGroup title="Standard Deductions" divided>
              <NumberField
                label="Federal"
                prefix="$"
                step="50"
                value={taxConfig.federalStandardDeduction}
                onValueChange={(value) => onUpdateTaxConfig({ federalStandardDeduction: value ?? 0 })}
              />
              <NumberField
                label="California"
                prefix="$"
                step="50"
                value={taxConfig.stateStandardDeduction}
                onValueChange={(value) => onUpdateTaxConfig({ stateStandardDeduction: value ?? 0 })}
              />
            </TaxFieldGroup>
            <TaxFieldGroup title="SALT" divided>
              <NumberField
                label="Max deduction"
                prefix="$"
                step="50"
                value={taxConfig.federalSaltCap}
                onValueChange={(value) => onUpdateTaxConfig({ federalSaltCap: value ?? 0 })}
              />
              <NumberField
                label="Floor"
                prefix="$"
                step="50"
                value={taxConfig.federalSaltCapFloor}
                onValueChange={(value) => onUpdateTaxConfig({ federalSaltCapFloor: value ?? 0 })}
              />
              <NumberField
                label="Phaseout MAGI"
                prefix="$"
                step="1000"
                value={taxConfig.federalSaltPhaseoutThreshold}
                onValueChange={(value) => onUpdateTaxConfig({ federalSaltPhaseoutThreshold: value ?? 0 })}
              />
              <NumberField
                label="Phaseout rate"
                suffix="%"
                step="1"
                value={taxConfig.federalSaltPhaseoutRate}
                onValueChange={(value) => onUpdateTaxConfig({ federalSaltPhaseoutRate: value ?? 0 })}
              />
            </TaxFieldGroup>
            <TaxFieldGroup title="Mortgage Debt Cap" divided>
              <NumberField
                label="Federal"
                prefix="$"
                step="1000"
                value={taxConfig.federalMortgageInterestDebtCap}
                onValueChange={(value) => onUpdateTaxConfig({ federalMortgageInterestDebtCap: value ?? 0 })}
              />
              <NumberField
                label="California"
                prefix="$"
                step="1000"
                value={taxConfig.stateMortgageInterestDebtCap}
                onValueChange={(value) => onUpdateTaxConfig({ stateMortgageInterestDebtCap: value ?? 0 })}
              />
            </TaxFieldGroup>
          </div>
        </AdvancedPanel>

        <AdvancedPanel id="taxTables" title="Bracket tables">
          <div className="grid gap-4">
            <TextAreaField
              label="Federal brackets"
              inputClassName="resize-none"
              value={federalBrackets}
              onChange={(event) => onSetFederalBrackets(event.target.value)}
            />
            <TextAreaField
              label="State brackets"
              inputClassName="resize-none"
              value={stateBrackets}
              onChange={(event) => onSetStateBrackets(event.target.value)}
            />
            <TextAreaField
              label="Long-term capital gains"
              inputClassName="resize-none"
              value={longTermCapitalGains}
              onChange={(event) => onSetLongTermCapitalGains(event.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <ActionButton onClick={onApplyTaxTables}>Apply tax tables</ActionButton>
            <div className={`min-h-6 ${labelTextClass}`}>{taxEditorStatus}</div>
          </div>
        </AdvancedPanel>
      </WorkspaceMetricSplit>
    </WorkspaceSection>
  );
}
