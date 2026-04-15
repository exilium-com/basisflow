import React from "react";
import { AddMenu } from "../AddMenu";
import { DollarPercentField, NumberField, SelectField } from "../Field";
import { MortgageLoanOptionList } from "../MortgageLoanOptions";
import { WorkspaceMetricSplit } from "./WorkspaceMetricSplit";
import { WorkspaceSection } from "./WorkspaceSection";
import { type StoredStateSetter } from "../../hooks/useStoredState";
import { labelTextClass } from "../../lib/text";
import {
  type Mortgage,
  type MortgageLoanField,
  type MortgageOptionKind,
  type MortgageState,
  toggleMortgageValueMode,
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
  monthlyHousingCost: string;
  mortgageSummaryItems: MetricItem[];
  onAddMortgageOption: (kind: MortgageOptionKind) => void;
  onRemoveLoan: (optionId: string) => void;
  onSelectLoan: (optionId: string) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateLoanName: (optionId: string, name: string) => void;
  onUpdateMortgageFundingBucketId: (bucketId: string) => void;
  setMortgageState: StoredStateSetter<MortgageState>;
  scenariosById: Record<string, MortgageScenario>;
};

export function MortgageSection({
  assetOptions,
  currentYear,
  mortgage,
  mortgageScenario,
  mortgageFundingBucketId,
  mortgageState,
  monthlyHousingCost,
  mortgageSummaryItems,
  onAddMortgageOption,
  onRemoveLoan,
  onSelectLoan,
  onUpdateLoanField,
  onUpdateLoanName,
  onUpdateMortgageFundingBucketId,
  setMortgageState,
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
                  <span>{isRentScenario ? "Estimated monthly rent for" : "Estimated monthly housing cost for"}</span>
                  <span className={labelTextClass}>{mortgageScenario.typeLabel}</span>
                </span>
              ),
              value: monthlyHousingCost,
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
              onValueChange={(value) =>
                setMortgageState((draft) => {
                  draft.homePrice = value ?? 0;
                })
              }
            />
            <DollarPercentField
              label="Down payment"
              mode={mortgageState.downPayment.mode}
              value={mortgageState.downPayment.value}
              dollarStep="1000"
              percentStep="0.5"
              onModeToggle={() =>
                setMortgageState((draft) => {
                  toggleMortgageValueMode(draft, "downPayment");
                })
              }
              onValueChange={(value) =>
                setMortgageState((draft) => {
                  draft.downPayment.value = value ?? 0;
                })
              }
            />
            <div className="col-span-2 grid grid-cols-3 gap-4">
              <NumberField
                label="Home insurance"
                prefix="$"
                suffix="/ year"
                value={mortgageState.insurancePerYear}
                step="50"
                onValueChange={(value) =>
                  setMortgageState((draft) => {
                    draft.insurancePerYear = value ?? 0;
                  })
                }
              />
              <NumberField
                label="HOA"
                prefix="$"
                suffix="/ month"
                value={mortgageState.hoaPerMonth}
                step="50"
                onValueChange={(value) =>
                  setMortgageState((draft) => {
                    draft.hoaPerMonth = value ?? 0;
                  })
                }
              />
              <SelectField
                label="Down payment funded by"
                value={mortgageFundingBucketId}
                onChange={(event) => onUpdateMortgageFundingBucketId(event.target.value)}
              >
                <option value="none">None</option>
                {assetOptions.map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-4">
              <NumberField
                label="Maintenance"
                suffix="% / year"
                step="0.1"
                value={mortgageState.maintenanceRate}
                onValueChange={(value) =>
                  setMortgageState((draft) => {
                    draft.maintenanceRate = value ?? 0;
                  })
                }
              />
              <DollarPercentField
                label="Buy closing cost"
                mode={mortgageState.purchaseClosingCost.mode}
                value={mortgageState.purchaseClosingCost.value}
                dollarStep="500"
                percentStep="0.1"
                onModeToggle={() =>
                  setMortgageState((draft) => {
                    toggleMortgageValueMode(draft, "purchaseClosingCost");
                  })
                }
                onValueChange={(value) =>
                  setMortgageState((draft) => {
                    draft.purchaseClosingCost.value = value ?? 0;
                  })
                }
              />
              <DollarPercentField
                label="Selling cost"
                mode={mortgageState.saleClosingCost.mode}
                value={mortgageState.saleClosingCost.value}
                dollarStep="500"
                percentStep="0.1"
                onModeToggle={() =>
                  setMortgageState((draft) => {
                    toggleMortgageValueMode(draft, "saleClosingCost");
                  })
                }
                onValueChange={(value) =>
                  setMortgageState((draft) => {
                    draft.saleClosingCost.value = value ?? 0;
                  })
                }
              />
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
