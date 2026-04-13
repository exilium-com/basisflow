import { describe, expect, it } from "vitest";
import { deriveAssetsState } from "../assetsModel";

describe("deriveAssetsState", () => {
  it("adds a pinned RSU asset row without counting it as a real asset bucket", () => {
    const assetsView = deriveAssetsState(
      {
        buckets: [
          {
            id: "brokerage",
            name: "Brokerage",
            linkedRsuId: null,
            taxTreatment: "none",
            current: 5000,
            contribution: null,
            growth: null,
            basis: 5000,
            illiquid: false,
          },
        ],
      },
      undefined,
      {},
      [
        {
          id: "rsu-1",
          name: "RSU grant",
          grantAmount: 250000,
          refresherAmount: 0,
          vestingYears: 4,
        },
      ],
    );

    const rsuBucket = assetsView.orderedBuckets.find((bucket) => bucket.linkedRsuId === "rsu-1");

    expect(rsuBucket).toMatchObject({
      name: "RSU grant",
      current: 250000,
      linkedRsuId: "rsu-1",
      illiquid: true,
    });
    expect(assetsView.assets.buckets.map((bucket) => bucket.id).sort()).toEqual(["brokerage", "cash-bucket"]);
    expect(assetsView.totals.currentTotal).toBe(5000);
  });
});
