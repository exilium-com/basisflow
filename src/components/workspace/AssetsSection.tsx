import { ActionButton } from "../ActionButton";
import { CheckboxField, NumberField, SelectField, TextField } from "../Field";
import { metricDeltaBetween } from "../MetricDelta";
import { ProjectedValueDisplay } from "../ProjectedValueDisplay";
import { RowItem } from "../RowItem";
import { WorkspaceSection } from "./WorkspaceSection";
import {
  PINNED_BUCKETS,
  type AssetBucketState,
  type DerivedAssetsState,
  type AssetTaxTreatment,
} from "../../lib/assetsModel";
import { usd } from "../../lib/format";
import { toDisplayValue, type Projection, type ProjectionAssetOverride } from "../../lib/projectionState";
import { type ProjectionRow } from "../../lib/projectionUtils";

type AssetsSectionProps = {
  assetsView: DerivedAssetsState;
  assetGrowthRate: number;
  assetOverrides: Record<string, ProjectionAssetOverride>;
  comparisonValuesById?: Record<string, number>;
  comparisonVestedRsuBalanceById?: Record<string, number>;
  currentRow: ProjectionRow;
  projection: Projection;
  selectedYearLabel: string;
  onAddAssetBucket: () => void;
  onRemoveAssetBucket: (bucketId: string) => void;
  onUpdateAssetBucket: (bucketId: string, patch: Partial<AssetBucketState>) => void;
  onUpdateAssetOverride: (bucketId: string, patch: ProjectionAssetOverride) => void;
};

export function AssetsSection({
  assetsView,
  assetGrowthRate,
  assetOverrides,
  comparisonValuesById,
  comparisonVestedRsuBalanceById,
  currentRow,
  projection,
  selectedYearLabel,
  onAddAssetBucket,
  onRemoveAssetBucket,
  onUpdateAssetBucket,
  onUpdateAssetOverride,
}: AssetsSectionProps) {
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;

  return (
    <WorkspaceSection
      id="assets"
      index="05"
      title="Assets"
      summary="Balance Sheet"
      actions={
        <ActionButton className="w-full sm:w-auto" onClick={onAddAssetBucket}>
          Add asset
        </ActionButton>
      }
    >
      <div className="grid gap-2">
        {assetsView.orderedBuckets.map((bucket) => {
          const isPinnedBucket = assetsView.pinnedBucketIds.has(bucket.id);
          const isLinkedRsuBucket = bucket.linkedRsuId != null;
          const override = assetOverrides[bucket.id];
          const showsGrowthOverride = bucket.id !== reserveCashBucketId;
          const detailsSummary = [
            override?.growth != null ? `Annual increase ${override.growth}%` : null,
            bucket.illiquid ? "Illiquid" : null,
          ]
            .filter(Boolean)
            .join(" • ");
          const value = toDisplayValue(
            bucket.linkedRsuId
              ? (currentRow.vestedRsuBalanceById[bucket.linkedRsuId] ?? 0)
              : (currentRow.bucketSnapshotsById[bucket.id]?.balance ?? bucket.current ?? 0),
            projection.currentYear,
            projection,
          );
          const comparisonValue = bucket.linkedRsuId
            ? comparisonVestedRsuBalanceById && (comparisonVestedRsuBalanceById[bucket.linkedRsuId] ?? 0)
            : comparisonValuesById && (comparisonValuesById[bucket.id] ?? 0);

          return (
            <RowItem
              key={bucket.id}
              pinned={isPinnedBucket}
              removeLabel={isPinnedBucket || isLinkedRsuBucket ? undefined : "Remove asset"}
              onRemove={isPinnedBucket || isLinkedRsuBucket ? undefined : () => onRemoveAssetBucket(bucket.id)}
              detailsTitle="Asset details"
              detailsSummary={detailsSummary || null}
              detailsClassName="grid gap-4 sm:grid-cols-2"
              details={
                <>
                  {showsGrowthOverride ? (
                    <NumberField
                      label="Annual increase"
                      suffix="%"
                      step="0.5"
                      value={override?.growth ?? null}
                      placeholder={String(assetGrowthRate)}
                      onValueChange={(value) => onUpdateAssetOverride(bucket.id, { growth: value })}
                    />
                  ) : null}
                  {!isLinkedRsuBucket ? (
                    <SelectField
                      label="Tax treatment"
                      value={bucket.taxTreatment}
                      disabled={isPinnedBucket}
                      onChange={(event) =>
                        onUpdateAssetBucket(bucket.id, { taxTreatment: event.target.value as AssetTaxTreatment })
                      }
                    >
                      <option value="none">Taxable</option>
                      <option value="taxDeductible">Tax-deductible</option>
                      <option value="taxDeferred">Tax-deferred</option>
                    </SelectField>
                  ) : null}
                  {!isLinkedRsuBucket && bucket.taxTreatment === "none" ? (
                    <NumberField
                      label="Current basis"
                      prefix="$"
                      step="1000"
                      value={bucket.basis}
                      placeholder={String(bucket.current ?? 0)}
                      inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                      onValueChange={(value) => onUpdateAssetBucket(bucket.id, { basis: value })}
                    />
                  ) : null}
                  {bucket.id !== reserveCashBucketId && !isLinkedRsuBucket ? (
                    <CheckboxField
                      label="Illiquid"
                      checked={bucket.illiquid}
                      onChange={(event) => onUpdateAssetBucket(bucket.id, { illiquid: event.target.checked })}
                    />
                  ) : null}
                </>
              }
            >
              <TextField
                label="Asset name"
                value={bucket.name}
                placeholder="Asset name"
                disabled={isPinnedBucket || isLinkedRsuBucket}
                inputClassName={isPinnedBucket || isLinkedRsuBucket ? "text-(--ink-soft)" : ""}
                onChange={(event) => onUpdateAssetBucket(bucket.id, { name: event.target.value })}
              />
              <NumberField
                label="Current value"
                prefix="$"
                step="1000"
                value={bucket.current}
                placeholder="0"
                disabled={isLinkedRsuBucket}
                inputClassName={isPinnedBucket || isLinkedRsuBucket ? "text-(--ink-soft)" : ""}
                onValueChange={(value) => onUpdateAssetBucket(bucket.id, { current: value })}
              />
              <ProjectedValueDisplay
                delta={metricDeltaBetween(value, comparisonValue)}
                label={selectedYearLabel}
                value={usd(value)}
              />
            </RowItem>
          );
        })}
      </div>
    </WorkspaceSection>
  );
}
