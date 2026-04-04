import React, { useEffect, useMemo } from "react";
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
  createBlankBucket,
  createDefaultAssetsState,
  ensurePinnedRetirementBuckets,
  getPinnedRetirementTargets,
  normalizeAssetInputs,
  normalizeAssetsState,
} from "../lib/assetsModel";
import {
  CASH_BUCKET_ID,
  createDefaultProjectionState,
  normalizeProjectionState,
} from "../lib/projectionModel";
import { loadStoredJson } from "../lib/storage";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";
import { ASSETS_STATE_KEY, PROJECTION_STATE_KEY } from "../lib/storageKeys";

export function AssetsPage() {
  const [state, setState] = useStoredState(
    ASSETS_STATE_KEY,
    createDefaultAssetsState,
    {
      normalize: normalizeAssetsState,
      localStorage: true,
      preferLocalStorage: true,
    },
  );

  const projectionState = useMemo(
    () =>
      normalizeProjectionState(
        loadStoredJson(PROJECTION_STATE_KEY, true) ??
          createDefaultProjectionState(),
        createDefaultProjectionState(),
      ),
    [state],
  );
  const syncedState = useMemo(
    () => {
      const nextState = ensurePinnedRetirementBuckets(state);

      if (nextState.buckets.some((bucket) => bucket.id === CASH_BUCKET_ID)) {
        return nextState;
      }

      return {
        ...nextState,
        buckets: [
          {
            id: CASH_BUCKET_ID,
            taxTreatment: "none",
            name: "Cash",
            current: "",
            contribution: "",
            growth: "0",
            basis: "",
            detailsOpen: false,
          },
          ...nextState.buckets,
        ],
      };
    },
    [state],
  );
  const pinnedBucketIds = useMemo(
    () =>
      new Set(
        [
          CASH_BUCKET_ID,
          ...Object.values(getPinnedRetirementTargets()),
        ],
      ),
    [],
  );
  const bucketIdSignature = state.buckets.map((bucket) => bucket.id).join("|");
  const syncedBucketIdSignature = syncedState.buckets
    .map((bucket) => bucket.id)
    .join("|");

  useEffect(() => {
    if (bucketIdSignature !== syncedBucketIdSignature) {
      setState(syncedState);
    }
  }, [bucketIdSignature, syncedBucketIdSignature, syncedState, setState]);

  const inputs = useMemo(
    () => normalizeAssetInputs(syncedState, projectionState.assetGrowthRate),
    [syncedState, projectionState.assetGrowthRate],
  );
  const orderedBuckets = useMemo(
    () =>
      [...syncedState.buckets].sort((left, right) => {
        const leftPinned = pinnedBucketIds.has(left.id);
        const rightPinned = pinnedBucketIds.has(right.id);

        if (leftPinned === rightPinned) {
          return 0;
        }

        return leftPinned ? -1 : 1;
      }),
    [syncedState.buckets, pinnedBucketIds],
  );
  const totals = useMemo(
    () => ({
      currentTotal: inputs.buckets.reduce((sum, bucket) => sum + bucket.current, 0),
      taxableCurrentTotal: inputs.buckets.reduce(
        (sum, bucket) =>
          sum + (bucket.taxTreatment === "none" ? bucket.current : 0),
        0,
      ),
      taxDeductibleCurrentTotal: inputs.buckets.reduce(
        (sum, bucket) =>
          sum + (bucket.taxTreatment === "taxDeductible" ? bucket.current : 0),
        0,
      ),
      taxDeferredCurrentTotal: inputs.buckets.reduce(
        (sum, bucket) =>
          sum + (bucket.taxTreatment === "taxDeferred" ? bucket.current : 0),
        0,
      ),
    }),
    [inputs],
  );

  function updateBucket(bucketId, patch) {
    setState((current) => ({
      ...current,
      buckets: current.buckets.map((bucket) => {
        if (bucket.id !== bucketId) {
          return bucket;
        }

        const nextBucket = { ...bucket, ...patch };
        if (
          typeof patch.taxTreatment === "string" &&
          patch.taxTreatment !== bucket.taxTreatment
        ) {
          return {
            ...nextBucket,
            basis: patch.taxTreatment === "none" ? nextBucket.basis : "",
          };
        }
        return nextBucket;
      }),
    }));
  }

  function reset() {
    setState(createDefaultAssetsState());
  }

  function addBucket() {
    setState((current) => ({
      ...current,
      buckets: [...current.buckets, createBlankBucket()],
    }));
  }

  function removeBucket(bucketId) {
    if (pinnedBucketIds.has(bucketId)) {
      return;
    }
    setState((current) => ({
      ...current,
      buckets: current.buckets.filter((bucket) => bucket.id !== bucketId),
    }));
  }

  const summaryItems = [
    { label: "Taxable assets", value: usd(totals.taxableCurrentTotal) },
    {
      label: "Tax-deductible assets",
      value: usd(totals.taxDeductibleCurrentTotal),
    },
    {
      label: "Tax-deferred assets",
      value: usd(totals.taxDeferredCurrentTotal),
    },
    { label: "Bucket count", value: String(inputs.buckets.length) },
  ];

  return (
    <PageShell
      actions={
        <ActionButton onClick={reset}>
          Reset
        </ActionButton>
      }
    >
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip
                kicker="Current Asset Total"
                value={usd(totals.currentTotal)}
              />
              <ResultList items={summaryItems} />
            </>
          }
        >
          <Section
            title="Assets"
            actions={
              <ActionButton onClick={addBucket}>
                Add asset
              </ActionButton>
            }
          >
            <div className="grid gap-2.5">
              {orderedBuckets.map((bucket) => {
                const isPinnedRetirementBucket = pinnedBucketIds.has(bucket.id);
                return (
                  <RowItem
                    key={bucket.id}
                    pinned={isPinnedRetirementBucket}
                    removeLabel={
                      isPinnedRetirementBucket ? undefined : "Remove asset"
                    }
                    onRemove={
                      isPinnedRetirementBucket
                        ? undefined
                        : () => removeBucket(bucket.id)
                    }
                    detailsTitle="Bucket details"
                    detailsOpen={bucket.detailsOpen}
                    onToggleDetails={(open) =>
                      updateBucket(bucket.id, { detailsOpen: open })
                    }
                    headerClassName="grid items-center gap-3 lg:grid-cols-2"
                    detailsContentClassName="grid gap-3 sm:grid-cols-2"
                    header={
                      <>
                        <TextField
                          label="Asset name"
                          value={bucket.name}
                          placeholder="Asset name"
                          disabled={isPinnedRetirementBucket}
                          inputClassName={
                            isPinnedRetirementBucket ? "text-(--ink-soft)" : ""
                          }
                          onChange={(event) =>
                            updateBucket(bucket.id, { name: event.target.value })
                          }
                        />
                        <NumberField
                          label="Current value"
                          prefix="$"
                          min="0"
                          step="1000"
                          value={bucket.current}
                          placeholder="0"
                          inputClassName={
                            isPinnedRetirementBucket ? "text-(--ink-soft)" : ""
                          }
                          onChange={(event) =>
                            updateBucket(bucket.id, {
                              current: event.target.value,
                            })
                          }
                        />
                      </>
                    }
                  >
                    <SelectField
                      label="Tax treatment"
                      value={bucket.taxTreatment}
                      disabled={isPinnedRetirementBucket}
                      onChange={(event) =>
                        updateBucket(bucket.id, {
                          taxTreatment: event.target.value,
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
                        inputClassName={
                          isPinnedRetirementBucket ? "text-(--ink-soft)" : ""
                        }
                        onChange={(event) =>
                          updateBucket(bucket.id, { basis: event.target.value })
                        }
                      />
                    ) : null}
                  </RowItem>
                );
              })}
            </div>
          </Section>

          <Section title="Current Bucket Snapshot" divider>
            <table>
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th>Current value</th>
                </tr>
              </thead>
              <tbody>
                {inputs.buckets.map((bucket) => (
                  <tr key={bucket.id}>
                    <td>{bucket.label}</td>
                    <td>{usd(bucket.current)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
