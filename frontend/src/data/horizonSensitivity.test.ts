import { describe, expect, it } from "vitest";
import apollo11 from "../../public/data/apollo-11.json";
import apollo12 from "../../public/data/apollo-12.json";
import shackleton from "../../public/data/shackleton-rim.json";
import deGerlache from "../../public/data/de-gerlache-rim.json";
import malapert from "../../public/data/malapert-massif.json";
import { horizonSensitivity } from "./horizonSensitivity";
import type { LumenDataset } from "../types/data";

const generatedSites = [apollo11, apollo12, shackleton, deGerlache, malapert] as LumenDataset[];

describe("horizon sensitivity mask", () => {
  it("reproduces each generated summary exactly at the zero-degree default", () => {
    for (const dataset of generatedSites) {
      expect(horizonSensitivity(dataset, 0)).toEqual({
        sunlitFraction: dataset.summary.sunlit_fraction,
        earthCenterVisibleFraction: dataset.summary.earth_center_visible_fraction,
      });
    }
  });

  it("applies the offset to center elevations and rejects out-of-range inputs", () => {
    const dataset = generatedSites[2];
    const baseline = horizonSensitivity(dataset, 0)!;
    const raised = horizonSensitivity(dataset, 2)!;
    expect(raised.sunlitFraction).toBeLessThanOrEqual(baseline.sunlitFraction);
    expect(raised.earthCenterVisibleFraction).toBeLessThanOrEqual(baseline.earthCenterVisibleFraction);
    expect(horizonSensitivity(dataset, -0.1)).toBeNull();
    expect(horizonSensitivity(dataset, 5.1)).toBeNull();
  });
});
