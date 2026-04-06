import React from "react";
import { produce } from "immer";
import { ActionButton } from "../components/ActionButton";
import { NumberField, SelectField, TextField } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { ResultList } from "../components/ResultList";
import { RowItem } from "../components/RowItem";
import { Section } from "../components/Section";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { usd } from "../lib/format";
import {
  DEFAULT_ASSETS_STATE,
  type AssetBucketState,
  type AssetTaxTreatment,
  buildIncomeDirectedContributions,
  createAssetBucket,
  deriveAssetsState,
  normalizeAssetsState,
} from "../lib/assetsModel";
import { type IncomeSummary } from "../lib/incomeModel";
import { loadStoredJson } from "../lib/storage";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";
import { ASSETS_STATE_KEY, INCOME_SUMMARY_KEY } from "../lib/storageKeys";

export function AssetsPage() {
  const [storedState, setStoredState] = useStoredState(ASSETS_STATE_KEY, DEFAULT_ASSETS_STATE, {
    normalize: normalizeAssetsState,
  });

  const incomeSummary = (loadStoredJson(INCOME_SUMMARY_KEY) ?? {}) as Partial<IncomeSummary>;
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);
  const assets = deriveAssetsState(storedState, undefined, incomeDirectedContributions);

  function updateBucket(bucketId: string, patch: Partial<AssetBucketState>) {
    setStoredState(
      produce(assets.state, (draft) => {
        const bucket = draft.buckets.find((entry) => entry.id === bucketId);
        if (!bucket) {
          return;
        }

        Object.assign(bucket, patch);
      }),
    );
  }

  function addBucket() {
    setStoredState(
      produce(assets.state, (draft) => {
        draft.buckets.push(createAssetBucket());
      }),
    );
  }

  function removeBucket(bucketId: string) {
    if (assets.pinnedBucketIds.has(bucketId)) {
      return;
    }
    setStoredState(
      produce(assets.state, (draft) => {
        draft.buckets = draft.buckets.filter((bucket) => bucket.id !== bucketId);
      }),
    );
  }

  const summaryItems = [
    { label: "Taxable assets", amount: assets.totals.taxableCurrentTotal },
    {
      label: "Tax-deductible assets",
      amount: assets.totals.taxDeductibleCurrentTotal,
    },
    {
      label: "Tax-deferred assets",
      amount: assets.totals.taxDeferredCurrentTotal,
    },
  ]
    .filter((item) => item.amount !== 0)
    .map((item) => ({ label: item.label, value: usd(item.amount) }));

  return (
    <PageShell>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip kicker="Current Asset Total" value={usd(assets.totals.currentTotal)} />
              <ResultList items={summaryItems} />
            </>
          }
        >
          <Section title="Assets" actions={<ActionButton onClick={addBucket}>Add asset</ActionButton>}>
            <div className="grid gap-2.5">
              {assets.orderedBuckets.map((bucket) => {
                const isPinnedBucket = assets.pinnedBucketIds.has(bucket.id);
                return (
                  <RowItem
                    key={bucket.id}
                    pinned={isPinnedBucket}
                    removeLabel={isPinnedBucket ? undefined : "Remove asset"}
                    onRemove={isPinnedBucket ? undefined : () => removeBucket(bucket.id)}
                    detailsTitle="Asset details"
                    detailsOpen={bucket.detailsOpen}
                    onToggleDetails={(open) => updateBucket(bucket.id, { detailsOpen: open })}
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
                          onChange={(event) => updateBucket(bucket.id, { name: event.target.value })}
                        />
                        <NumberField
                          label="Current value"
                          prefix="$"
                          min="0"
                          step="1000"
                          value={bucket.current}
                          placeholder="0"
                          inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                          onValueChange={(value) =>
                            updateBucket(bucket.id, {
                              current: value,
                            })
                          }
                        />
                      </>
                    }
                  >
                    <SelectField
                      label="Tax treatment"
                      value={bucket.taxTreatment}
                      disabled={isPinnedBucket}
                      onChange={(event) =>
                        updateBucket(bucket.id, {
                          taxTreatment: event.target.value as AssetTaxTreatment,
                        })
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
                        onValueChange={(value) => updateBucket(bucket.id, { basis: value })}
                      />
                    ) : null}
                  </RowItem>
                );
              })}
            </div>
          </Section>
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
