import React, { useEffect, useMemo, useState } from "react";
import { ActionButton } from "../components/ActionButton";
import { CheckboxField, NumberField, TextField } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { ResultList } from "../components/ResultList";
import { RowItem } from "../components/RowItem";
import { Section } from "../components/Section";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { usd } from "../lib/format";
import { loadStoredJson, saveJson } from "../lib/storage";
import {
  calculateAssetSnapshot,
  createBlankBucket,
  createDefaultAssetsState,
  normalizeAssetInputs,
  normalizeAssetsState,
} from "../lib/assetsModel";
import {
  createDefaultProjectionState,
  normalizeProjectionState,
} from "../lib/projectionModel";
import {
  loadTaxConfig,
  STORAGE_KEY as TAX_STORAGE_KEY,
} from "../lib/taxConfig";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";
import {
  ASSETS_STATE_KEY,
  ASSETS_SUMMARY_KEY,
  PROJECTION_STATE_KEY,
} from "../lib/storageKeys";

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
  const [taxVersion, setTaxVersion] = useState(0);

  useEffect(() => {
    function refreshTaxVersion(event) {
      if (!event || event.key === TAX_STORAGE_KEY) {
        setTaxVersion((current) => current + 1);
      }
    }

    function handleVisibility() {
      if (!document.hidden) {
        setTaxVersion((current) => current + 1);
      }
    }

    window.addEventListener("storage", refreshTaxVersion);
    window.addEventListener("pageshow", refreshTaxVersion);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", refreshTaxVersion);
      window.removeEventListener("pageshow", refreshTaxVersion);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

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
  const taxConfig = useMemo(() => loadTaxConfig(), [taxVersion]);
  const results = useMemo(
    () => calculateAssetSnapshot(inputs, taxConfig),
    [inputs, taxConfig],
  );

  useEffect(() => {
    saveJson(ASSETS_SUMMARY_KEY, {
      currentTotal: results.totals.currentTotal,
      annualContributionTotal: results.totals.annualContributionTotal,
      baselineGrowthRate: inputs.baselineGrowthRate,
      bucketCount: inputs.buckets.length,
      currentEmbeddedTax: results.totals.currentEmbeddedTax,
      buckets: inputs.buckets.map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        taxFree: bucket.taxFree,
        current: bucket.current,
        contribution: bucket.contribution,
        growth: bucket.growth,
        basis: bucket.basis,
      })),
    });
  }, [inputs, results]);

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
    { label: "Taxable assets", value: usd(results.totals.taxableCurrentTotal) },
    {
      label: "Tax-free assets",
      value: usd(results.totals.taxFreeCurrentTotal),
    },
    {
      label: "Current embedded tax",
      value: usd(results.totals.currentEmbeddedTax),
    },
    {
      label: "After-tax value today",
      value: usd(results.totals.afterTaxCurrentTotal),
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
                value={usd(results.totals.currentTotal)}
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
                  <th>Embedded tax</th>
                  <th>After-tax value</th>
                </tr>
              </thead>
              <tbody>
                {results.buckets.map((bucket) => (
                  <tr key={bucket.id}>
                    <td>{bucket.label}</td>
                    <td>{usd(bucket.balance)}</td>
                    <td>{usd(bucket.taxDue)}</td>
                    <td>{usd(bucket.afterTax)}</td>
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
