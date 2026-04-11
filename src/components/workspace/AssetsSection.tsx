import React from "react";
import { ActionButton } from "../ActionButton";
import { NumberField, SelectField, TextField } from "../Field";
import { RowItem } from "../RowItem";
import { WorkspaceSection } from "./WorkspaceSection";
import { type AssetBucketState, type DerivedAssetsState, type AssetTaxTreatment } from "../../lib/assetsModel";

type AssetsSectionProps = {
  assetsView: DerivedAssetsState;
  onAddAssetBucket: () => void;
  onRemoveAssetBucket: (bucketId: string) => void;
  onUpdateAssetBucket: (bucketId: string, patch: Partial<AssetBucketState>) => void;
};

export function AssetsSection({ assetsView, onAddAssetBucket, onRemoveAssetBucket, onUpdateAssetBucket }: AssetsSectionProps) {
  return (
    <WorkspaceSection
      id="assets"
      index="05"
      title="Assets"
      summary="Balance Sheet"
      actions={<ActionButton onClick={onAddAssetBucket}>Add asset</ActionButton>}
    >
      <div className="grid gap-2.5">
        {assetsView.orderedBuckets.map((bucket) => {
          const isPinnedBucket = assetsView.pinnedBucketIds.has(bucket.id);

          return (
            <RowItem
              key={bucket.id}
              pinned={isPinnedBucket}
              removeLabel={isPinnedBucket ? undefined : "Remove asset"}
              onRemove={isPinnedBucket ? undefined : () => onRemoveAssetBucket(bucket.id)}
              detailsTitle="Asset details"
              detailsOpen={bucket.detailsOpen}
              onToggleDetails={(detailsOpen) => onUpdateAssetBucket(bucket.id, { detailsOpen })}
              headerClassName="grid items-center gap-3 lg:grid-cols-2"
              detailsContentClassName="grid gap-3 sm:grid-cols-2"
              header={
                <>
                  <TextField
                    label="Asset name"
                    value={bucket.name}
                    placeholder="Asset name"
                    disabled={isPinnedBucket}
                    inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                    onChange={(event) => onUpdateAssetBucket(bucket.id, { name: event.target.value })}
                  />
                  <NumberField
                    label="Current value"
                    prefix="$"
                    min="0"
                    step="1000"
                    value={bucket.current}
                    placeholder="0"
                    inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                    onValueChange={(value) => onUpdateAssetBucket(bucket.id, { current: value })}
                  />
                </>
              }
            >
              <SelectField
                label="Tax treatment"
                value={bucket.taxTreatment}
                disabled={isPinnedBucket}
                onChange={(event) =>
                  onUpdateAssetBucket(bucket.id, { taxTreatment: event.target.value as AssetTaxTreatment })
                }
              >
                <option value="none">None</option>
                <option value="taxDeductible">Tax-deductible</option>
                <option value="taxDeferred">Tax-deferred</option>
              </SelectField>
              {bucket.taxTreatment === "none" ? (
                <NumberField
                  label="Current basis"
                  prefix="$"
                  min="0"
                  step="1000"
                  value={bucket.basis}
                  placeholder="0"
                  inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                  onValueChange={(value) => onUpdateAssetBucket(bucket.id, { basis: value })}
                />
              ) : null}
            </RowItem>
          );
        })}
      </div>
    </WorkspaceSection>
  );
}
