import React from "react";
import { ActionButton } from "../ActionButton";
import { NumberField, SelectField } from "../Field";
import { MetricGrid } from "../MetricGrid";
import { MortgageLoanOptionList } from "../MortgageLoanOptions";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import { getMortgageMonthlyPaymentForYear } from "../../lib/mortgagePage";
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
  expandedLoanId: string | null;
  mortgage: Mortgage;
  mortgageScenario: MortgageScenario;
  mortgageFundingBucketId: string;
  mortgageState: MortgageState;
  mortgageSummaryItems: MetricItem[];
  onAddMortgageOption: () => void;
  onHandleDownPaymentMode: (mode: MortgageDownPaymentMode) => void;
  onRemoveLoan: (optionId: string) => void;
  onSelectLoan: (optionId: string) => void;
  onSetExpandedLoanId: (optionId: string | null) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateLoanKind: (optionId: string, kind: MortgageOptionKind) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  onUpdateMortgageFundingBucketId: (bucketId: string) => void;
  onUpdateMortgageState: (patch: Partial<MortgageState>) => void;
  scenariosById: Record<string, MortgageScenario>;
};

export function MortgageSection({
  assetOptions,
  currentYear,
  expandedLoanId,
  mortgage,
  mortgageScenario,
  mortgageFundingBucketId,
  mortgageState,
  mortgageSummaryItems,
  onAddMortgageOption,
  onHandleDownPaymentMode,
  onRemoveLoan,
  onSelectLoan,
  onSetExpandedLoanId,
  onUpdateLoanField,
  onUpdateLoanKind,
  onUpdateLoanName,
  onUpdateMortgageFundingBucketId,
  onUpdateMortgageState,
  scenariosById,
}: MortgageSectionProps) {
  const isRentScenario = mortgageScenario.kind === "rent";

  return (
    <WorkspaceSection
      id="mortgage"
      index="02"
      title="Home & Mortgage"
      summary="Housing Cost"
      actions={<ActionButton onClick={onAddMortgageOption}>Add housing option</ActionButton>}
    >
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Home price"
              prefix="$"
              value={mortgageState.homePrice}
              step="50000"
              disabled={isRentScenario}
              onValueChange={(value) => onUpdateMortgageState({ homePrice: value ?? 0 })}
            />

            <div className="flex items-end gap-4">
              <SegmentedToggle
                label="Down payment"
                ariaLabel="Down payment mode"
                className="w-fit"
                value={mortgageState.downPaymentMode}
                disabled={isRentScenario}
                onChange={onHandleDownPaymentMode}
                options={[
                  { value: "dollar", label: "$" },
                  { value: "percent", label: "%" },
                ]}
              />
              <NumberField
                className="min-w-0 flex-1"
                label={null}
                value={mortgageState.downPayment}
                step={mortgageState.downPaymentMode === "dollar" ? "1000" : "0.5"}
                disabled={isRentScenario}
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
                disabled={isRentScenario}
                onValueChange={(value) => onUpdateMortgageState({ insurancePerYear: value ?? 0 })}
              />
              <NumberField
                label="HOA"
                prefix="$"
                suffix="/ month"
                value={mortgageState.hoaPerMonth}
                step="1"
                disabled={isRentScenario}
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

          <MortgageLoanOptionList
            expandedLoanId={expandedLoanId}
            currentYear={currentYear}
            mortgage={mortgage}
            scenariosById={scenariosById}
            state={mortgageState}
            onSelectLoan={onSelectLoan}
            onSetExpandedLoanId={onSetExpandedLoanId}
            onUpdateLoanField={onUpdateLoanField}
            onUpdateLoanName={onUpdateLoanName}
            onUpdateLoanKind={onUpdateLoanKind}
            onRemoveLoan={onRemoveLoan}
          />
        </div>

        <div className="col-span-2 h-full">
          <div className="sticky top-4">
            <MetricGrid
              primaryItem={{
                label: isRentScenario ? "Estimated monthly rent" : "Estimated monthly payment",
                value: usd(getMortgageMonthlyPaymentForYear(mortgageScenario, currentYear)),
              }}
              items={mortgageSummaryItems}
            />
          </div>
        </div>
      </div>
    </WorkspaceSection>
  );
}
