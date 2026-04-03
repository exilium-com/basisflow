import React, { useMemo } from "react";
import { ActionButton } from "../components/ActionButton";
import { CheckboxField, NumberField, TextField } from "../components/Field";
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
  normalizeAssetInputs,
  normalizeAssetsState,
} from "../lib/assetsModel";
import {
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
  const inputs = useMemo(
    () => normalizeAssetInputs(state, projectionState.assetGrowthRate),
    [state, projectionState.assetGrowthRate],
  );
  const totals = useMemo(
    () => ({
      currentTotal: inputs.buckets.reduce((sum, bucket) => sum + bucket.current, 0),
      taxableCurrentTotal: inputs.buckets.reduce(
        (sum, bucket) => sum + (bucket.taxFree ? 0 : bucket.current),
        0,
      ),
      taxFreeCurrentTotal: inputs.buckets.reduce(
        (sum, bucket) => sum + (bucket.taxFree ? bucket.current : 0),
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
          typeof patch.taxFree === "boolean" &&
          patch.taxFree !== bucket.taxFree
        ) {
          return {
            ...nextBucket,
            basis: "",
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
    setState((current) => ({
      ...current,
      buckets: current.buckets.filter((bucket) => bucket.id !== bucketId),
    }));
  }

  const summaryItems = [
    { label: "Taxable assets", value: usd(totals.taxableCurrentTotal) },
    {
      label: "Tax-free assets",
      value: usd(totals.taxFreeCurrentTotal),
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
              {state.buckets.map((bucket) => {
                return (
                  <RowItem
                    key={bucket.id}
                    removeLabel="Remove asset"
                    onRemove={() => removeBucket(bucket.id)}
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
                          onChange={(event) =>
                            updateBucket(bucket.id, {
                              current: event.target.value,
                            })
                          }
                        />
                      </>
                    }
                  >
                    <CheckboxField
                      label="Tax-free growth"
                      checked={bucket.taxFree}
                      onChange={(event) =>
                        updateBucket(bucket.id, { taxFree: event.target.checked })
                      }
                    />
                    {!bucket.taxFree ? (
                      <NumberField
                        label="Current basis"
                        prefix="$"
                        min="0"
                        step="1000"
                        value={bucket.basis}
                        placeholder="0"
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
