import { DollarPercentField, NumberField, SelectField } from "../Field";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceMetricSplit } from "./WorkspaceMetricSplit";
import { WorkspaceSection } from "./WorkspaceSection";
import {
  type MortgageLoanField,
  type MortgageOptionKind,
  type MortgageState,
  toggleMortgageValueMode,
} from "../../lib/mortgageConfig";
import { type MortgageScenario } from "../../lib/mortgageSchedule";
import type { DraftStateSetter } from "../../lib/state";

type MetricItem = { label: string; value: string; metricValue?: number };

type MortgageSectionProps = {
  assetOptions: Array<{ id: string; name: string }>;
  comparisonMetrics?: {
    monthlyHousingCostValue: number;
    summaryItems: MetricItem[];
  } | null;
  mortgageScenario: MortgageScenario;
  mortgageFundingBucketId: string;
  mortgageState: MortgageState;
  monthlyHousingCost: string;
  monthlyHousingCostValue: number;
  mortgageSummaryItems: MetricItem[];
  onChangeHousingKind: (kind: MortgageOptionKind) => void;
  onUpdateLoanField: (optionId: string, field: MortgageLoanField, value: number | null) => void;
  onUpdateMortgageFundingBucketId: (bucketId: string) => void;
  setMortgageState: DraftStateSetter<MortgageState>;
};

export function MortgageSection({
  assetOptions,
  comparisonMetrics,
  mortgageScenario,
  mortgageFundingBucketId,
  mortgageState,
  monthlyHousingCost,
  monthlyHousingCostValue,
  mortgageSummaryItems,
  onChangeHousingKind,
  onUpdateLoanField,
  onUpdateMortgageFundingBucketId,
  setMortgageState,
}: MortgageSectionProps) {
  const isRentScenario = mortgageScenario.kind === "rent";
  const housingMode = isRentScenario ? "rent" : "buy";
  const loanState = mortgageState.options[0];
  const mortgageType = mortgageScenario.kind === "arm" ? "arm" : "conventional";
  const comparisonItemsByLabel = new Map((comparisonMetrics?.summaryItems ?? []).map((item) => [item.label, item]));

  function handleHousingModeChange(mode: "buy" | "rent") {
    onChangeHousingKind(mode === "rent" ? "rent" : mortgageType);
  }

  return (
    <WorkspaceSection id="mortgage" index="02" title="Home & Mortgage" summary="Housing Cost">
      <WorkspaceMetricSplit
        metrics={{
          primaryItem: {
            deltaValue: comparisonMetrics
              ? monthlyHousingCostValue - comparisonMetrics.monthlyHousingCostValue
              : undefined,
            label: isRentScenario ? "Estimated monthly rent" : "Estimated monthly housing cost",
            value: monthlyHousingCost,
          },
          items: mortgageSummaryItems.map((item) => {
            const comparisonValue = comparisonMetrics
              ? (comparisonItemsByLabel.get(item.label)?.metricValue ?? 0)
              : null;

            return {
              ...item,
              deltaValue:
                item.metricValue != null && comparisonValue != null ? item.metricValue - comparisonValue : undefined,
            };
          }),
        }}
      >
        <div className="flex flex-wrap items-end gap-4">
          <SegmentedToggle
            ariaLabel="Housing type"
            label="Housing"
            value={housingMode}
            onChange={handleHousingModeChange}
            options={[
              { value: "buy", label: "Buy" },
              { value: "rent", label: "Rent" },
            ]}
          />
          {!isRentScenario ? (
            <SegmentedToggle
              ariaLabel="Mortgage type"
              label="Mortgage"
              value={mortgageType}
              onChange={onChangeHousingKind}
              options={[
                { value: "conventional", label: "Conventional" },
                { value: "arm", label: "ARM" },
              ]}
            />
          ) : null}
        </div>
        {isRentScenario ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Rent"
              prefix="$"
              suffix="/ month"
              value={loanState?.rentPerMonth}
              step="50"
              onValueChange={(value) => onUpdateLoanField(mortgageScenario.optionId, "rentPerMonth", value)}
            />
            <NumberField
              label="Yearly increase"
              suffix="%"
              value={loanState?.rentGrowthRate}
              step="0.5"
              onValueChange={(value) => onUpdateLoanField(mortgageScenario.optionId, "rentGrowthRate", value)}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-6">
            <NumberField
              className="sm:col-span-3"
              label={mortgageType === "arm" ? "Initial rate" : "Interest rate"}
              suffix="%"
              value={mortgageType === "arm" ? loanState?.initialRate : loanState?.rate}
              step="0.125"
              onValueChange={(value) =>
                onUpdateLoanField(mortgageScenario.optionId, mortgageType === "arm" ? "initialRate" : "rate", value)
              }
            />
            <NumberField
              className="sm:col-span-3"
              label="Loan term"
              suffix="years"
              value={loanState?.term}
              step="1"
              onValueChange={(value) => onUpdateLoanField(mortgageScenario.optionId, "term", value)}
            />
            {mortgageType === "arm" ? (
              <>
                <NumberField
                  className="sm:col-span-3"
                  label="Reset rate"
                  suffix="%"
                  value={loanState?.adjustedRate}
                  step="0.125"
                  onValueChange={(value) => onUpdateLoanField(mortgageScenario.optionId, "adjustedRate", value)}
                />
                <NumberField
                  className="sm:col-span-3"
                  label="Fixed years"
                  suffix="years"
                  value={loanState?.fixedYears}
                  step="1"
                  onValueChange={(value) => onUpdateLoanField(mortgageScenario.optionId, "fixedYears", value)}
                />
              </>
            ) : null}
            <NumberField
              className="sm:col-span-3"
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
            <NumberField
              className="sm:col-span-3"
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
            <NumberField
              className="sm:col-span-2"
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
              className="sm:col-span-2"
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
              className="sm:col-span-2"
              label="Funding source"
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
            <DollarPercentField
              className="sm:col-span-2"
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
            <DollarPercentField
              className="sm:col-span-2"
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
              className="sm:col-span-2"
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
        )}
      </WorkspaceMetricSplit>
    </WorkspaceSection>
  );
}
