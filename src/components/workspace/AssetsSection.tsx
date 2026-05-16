import { ActionButton } from "../ActionButton";
import { CheckboxField, NumberField, SelectField } from "../Field";
import { metricDeltaBetween } from "../MetricDelta";
import { RowItem } from "../RowItem";
import { RowMoneyField, RowValueProjection } from "./RowValueProjection";
import { workspaceSectionActionClassName, WorkspaceSection, WorkspaceSectionFooter } from "./WorkspaceSection";
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
  comparison?: {
    currentRow: ProjectionRow;
    projection: Projection;
  } | null;
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
  comparison,
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
    <WorkspaceSection id="assets" index="05" title="Assets" summary="Balance Sheet">
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
          const comparisonBalance = bucket.linkedRsuId
            ? (comparison?.currentRow.vestedRsuBalanceById[bucket.linkedRsuId] ?? 0)
            : (comparison?.currentRow.bucketSnapshotsById[bucket.id]?.balance ?? 0);
          const comparisonValue =
            comparison && toDisplayValue(comparisonBalance, comparison.projection.currentYear, comparison.projection);
          const canEditBucket = !isPinnedBucket && !isLinkedRsuBucket;

          return (
            <RowItem
              key={bucket.id}
              detailsSummary={detailsSummary || null}
              fallbackName="Untitled asset"
              name={bucket.name}
              canRename={canEditBucket}
              renameAriaLabel="Asset name"
              onRemove={canEditBucket ? () => onRemoveAssetBucket(bucket.id) : undefined}
              onRename={(nextName) => onUpdateAssetBucket(bucket.id, { name: nextName })}
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
              <RowValueProjection
                delta={metricDeltaBetween(value, comparisonValue)}
                label={selectedYearLabel}
                value={usd(value)}
              >
                <RowMoneyField
                  label="Current value"
                  step="1000"
                  value={bucket.current}
                  placeholder="0"
                  disabled={isLinkedRsuBucket}
                  muted={isLinkedRsuBucket}
                  onValueChange={(value) => onUpdateAssetBucket(bucket.id, { current: value })}
                />
              </RowValueProjection>
            </RowItem>
          );
        })}
      </div>
      <WorkspaceSectionFooter>
        <ActionButton className={workspaceSectionActionClassName} onClick={onAddAssetBucket}>
          Add asset
        </ActionButton>
      </WorkspaceSectionFooter>
    </WorkspaceSection>
  );
}
