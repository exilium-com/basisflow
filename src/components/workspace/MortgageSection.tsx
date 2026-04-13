import React from "react";
import { AddMenu } from "../AddMenu";
import { NumberField, SelectField } from "../Field";
import { MortgageLoanOptionList } from "../MortgageLoanOptions";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceMetricSplit } from "./WorkspaceMetricSplit";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import { getMortgageMonthlyPaymentForYear } from "../../lib/mortgagePage";
import { labelTextClass } from "../../lib/text";
import {
  type Mortgage,
  type MortgageDownPaymentMode,
  type MortgageLoanField,
  type MortgageOptionKind,
  type MortgageState,
} from "../../lib/mortgageConfig";
import { type MortgageScenario } from "../../lib/mortgageSchedule";

type MetricItem = { label: string; value: string };

type MortgageSectionProps = {
  assetOptions: Array<{ id: string; name: string }>;
  currentYear: number;
  mortgage: Mortgage;
  mortgageScenario: MortgageScenario;
  mortgageFundingBucketId: string;
  mortgageState: MortgageState;
  mortgageSummaryItems: MetricItem[];
  onAddMortgageOption: (kind: MortgageOptionKind) => void;
  onHandleDownPaymentMode: (mode: MortgageDownPaymentMode) => void;
  onRemoveLoan: (optionId: string) => void;
  onSelectLoan: (optionId: string) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  onUpdateMortgageFundingBucketId: (bucketId: string) => void;
  onUpdateMortgageState: (patch: Partial<MortgageState>) => void;
  scenariosById: Record<string, MortgageScenario>;
};

export function MortgageSection({
  assetOptions,
  currentYear,
  mortgage,
  mortgageScenario,
  mortgageFundingBucketId,
  mortgageState,
  mortgageSummaryItems,
  onAddMortgageOption,
  onHandleDownPaymentMode,
  onRemoveLoan,
  onSelectLoan,
  onUpdateLoanField,
  onUpdateLoanName,
  onUpdateMortgageFundingBucketId,
  onUpdateMortgageState,
  scenariosById,
}: MortgageSectionProps) {
  const isRentScenario = mortgageScenario.kind === "rent";
  const allScenariosAreRent = mortgageState.options.every((option) => option.kind === "rent");

  return (
    <WorkspaceSection
      id="mortgage"
      index="02"
      title="Home & Mortgage"
      summary="Housing Cost"
      actions={
        <AddMenu
          label="Add scenario"
          options={[
            { id: "conventional", label: "Conventional", onSelect: () => onAddMortgageOption("conventional") },
            { id: "arm", label: "ARM", onSelect: () => onAddMortgageOption("arm") },
            { id: "rent", label: "Rent", onSelect: () => onAddMortgageOption("rent") },
          ]}
        />
      }
    >
      <WorkspaceMetricSplit
        mainClassName="grid gap-4"
        metrics={
          {
            primaryItem: {
              label: (
                <span className="grid gap-1">
                  <span>{isRentScenario ? "Estimated monthly rent for" : "Estimated monthly payment for"}</span>
                  <span className={labelTextClass}>{mortgageScenario.typeLabel}</span>
                </span>
              ),
              value: usd(getMortgageMonthlyPaymentForYear(mortgageScenario, currentYear)),
            },
            items: mortgageSummaryItems,
          }
        }
      >
        {!allScenariosAreRent ? (
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Home price"
              prefix="$"
              value={mortgageState.homePrice}
              step="50000"
              onValueChange={(value) => onUpdateMortgageState({ homePrice: value ?? 0 })}
            />

            <div className="flex items-end gap-4">
              <div className="shrink-0">
                <SegmentedToggle
                  label="Down payment"
                  ariaLabel="Down payment mode"
                  className="w-fit"
                  value={mortgageState.downPaymentMode}
                  onChange={onHandleDownPaymentMode}
                  options={[
                    { value: "dollar", label: "$" },
                    { value: "percent", label: "%" },
                  ]}
                />
              </div>
              <NumberField
                className="min-w-0 flex-1"
                label={null}
                prefix={mortgageState.downPaymentMode === "dollar" ? "$" : null}
                suffix={mortgageState.downPaymentMode === "percent" ? "%" : null}
                value={mortgageState.downPayment}
                step={mortgageState.downPaymentMode === "dollar" ? "1000" : "0.5"}
                onValueChange={(value) => onUpdateMortgageState({ downPayment: value ?? 0 })}
              />
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-4">
              <NumberField
                label="Home insurance"
                prefix="$"
                suffix="/ year"
                value={mortgageState.insurancePerYear}
                step="1"
                onValueChange={(value) => onUpdateMortgageState({ insurancePerYear: value ?? 0 })}
              />
              <NumberField
                label="HOA"
                prefix="$"
                suffix="/ month"
                value={mortgageState.hoaPerMonth}
                step="1"
                onValueChange={(value) => onUpdateMortgageState({ hoaPerMonth: value ?? 0 })}
              />
              <SelectField
                label="Down payment funded by"
                value={mortgageFundingBucketId}
                onChange={(event) => onUpdateMortgageFundingBucketId(event.target.value)}
              >
                <option value="">None</option>
                {assetOptions.map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        ) : null}

        <MortgageLoanOptionList
          currentYear={currentYear}
          mortgage={mortgage}
          scenariosById={scenariosById}
          state={mortgageState}
          onSelectLoan={onSelectLoan}
          onUpdateLoanField={onUpdateLoanField}
          onUpdateLoanName={onUpdateLoanName}
          onRemoveLoan={onRemoveLoan}
        />
      </WorkspaceMetricSplit>
    </WorkspaceSection>
  );
}
