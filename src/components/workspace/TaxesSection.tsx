import React from "react";
import { AdvancedPanel } from "../AdvancedPanel";
import { ActionButton } from "../ActionButton";
import { MetricGrid } from "../MetricGrid";
import { NumberField, TextAreaField } from "../Field";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import { type IncomeResults, type ResolvedIncome } from "../../lib/incomeModel";
import { type MortgageState } from "../../lib/mortgageConfig";
import { type TaxConfig } from "../../lib/taxConfig";
import { labelTextClass } from "../../lib/text";

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
  onUpdateMortgageState: (patch: Partial<MortgageState>) => void;
  onUpdateTaxConfig: (patch: Partial<TaxConfig>) => void;
};

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
  onUpdateMortgageState,
  onUpdateTaxConfig,
}: TaxesSectionProps) {
  return (
    <WorkspaceSection id="taxes" index="03" title="Taxes" summary="Deduction Logic">
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 grid content-start gap-4">
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
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="CA SDI rate"
                suffix="%"
                min="0"
                step="0.5"
                value={taxConfig.caSdiRate}
                onValueChange={(value) => onUpdateTaxConfig({ caSdiRate: value ?? 0 })}
              />
              <NumberField
                label="Property tax rate"
                suffix="%"
                value={mortgageState.propertyTaxRate}
                step="0.1"
                onValueChange={(value) => onUpdateMortgageState({ propertyTaxRate: value ?? 0 })}
              />
              <NumberField
                label="401(k) total contribution cap"
                prefix="$"
                min="0"
                step="100"
                value={taxConfig.annualAdditionsLimit}
                onValueChange={(value) => onUpdateTaxConfig({ annualAdditionsLimit: value ?? 0 })}
              />
              <NumberField
                label="Federal standard deduction"
                prefix="$"
                min="0"
                step="50"
                value={taxConfig.federalStandardDeduction}
                onValueChange={(value) => onUpdateTaxConfig({ federalStandardDeduction: value ?? 0 })}
              />
              <NumberField
                label="California standard deduction"
                prefix="$"
                min="0"
                step="50"
                value={taxConfig.stateStandardDeduction}
                onValueChange={(value) => onUpdateTaxConfig({ stateStandardDeduction: value ?? 0 })}
              />
              <NumberField
                label="Federal SALT deduction cap"
                prefix="$"
                min="0"
                step="50"
                value={taxConfig.federalSaltCap}
                onValueChange={(value) => onUpdateTaxConfig({ federalSaltCap: value ?? 0 })}
              />
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
            <div className="mt-4 flex items-center gap-4">
              <ActionButton onClick={onApplyTaxTables}>Apply tax tables</ActionButton>
              <div className={`min-h-6 ${labelTextClass}`}>{taxEditorStatus}</div>
            </div>
          </AdvancedPanel>
        </div>

        <div className="col-span-2">
          <MetricGrid
            primaryItem={{ label: "Total tax", value: usd(incomeResults.totalTaxes) }}
            items={[
              { label: "Federal tax", value: usd(incomeResults.federalTax) },
              { label: "California tax", value: usd(incomeResults.californiaTax) },
              { label: "FICA + CA SDI", value: usd(incomeResults.fica.total + incomeResults.caSdi) },
              { label: "Property tax", value: usd(income.propertyTax) },
            ]}
          />
        </div>
      </div>
    </WorkspaceSection>
  );
}
