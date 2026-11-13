import { describe, expect, it } from "vitest";
import shackleton from "../../public/data/shackleton-rim.json";
import { computeScenarioMetrics, SCHEDULE_WINDOW_DAYS } from "./scheduleSlip";
import type { LumenDataset } from "../types/data";

describe("schedule slip metrics", () => {
  const dataset = shackleton as LumenDataset;

  it("computes a bounded seven-day comparison from the generated polar series", () => {
    const result = computeScenarioMetrics(dataset, dataset.time.start_utc);
    expect(result).not.toBeNull();
    expect(result?.sampleCount).toBe((SCHEDULE_WINDOW_DAYS * 86400) / dataset.time.step_s);
    expect(result?.startUtc).toBe(dataset.time.start_utc);
    expect(result?.endUtc).toBe("2027-01-08T00:00:00Z");

    const count = result!.sampleCount;
    const expectedSunlit = dataset.series.sun_el_deg.slice(0, count).filter((el) => el > 0).length / count;
    const expectedEarthVisible = dataset.series.earth_el_deg.slice(0, count).filter((el) => el > 0).length / count;
    expect(result?.sunlitFraction).toBe(expectedSunlit);
    expect(result?.earthCenterVisibleFraction).toBe(expectedEarthVisible);
  });

  it("returns null if the dataset cannot cover a complete comparison interval", () => {
    const short = {
      ...dataset,
      series: {
        ...dataset.series,
        sun_el_deg: dataset.series.sun_el_deg.slice(0, 3),
        earth_el_deg: dataset.series.earth_el_deg.slice(0, 3),
      },
    };
    expect(computeScenarioMetrics(short, dataset.time.start_utc)).toBeNull();
  });
});
