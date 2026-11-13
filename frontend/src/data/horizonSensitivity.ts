import type { LumenDataset } from "../types/data";

export interface HorizonSensitivitySummary {
  sunlitFraction: number;
  earthCenterVisibleFraction: number;
}

/** Apply a user-set elevation mask to stored center-elevation samples. */
export function horizonSensitivity(
  dataset: LumenDataset,
  offsetDeg: number,
): HorizonSensitivitySummary | null {
  if (!Number.isFinite(offsetDeg) || offsetDeg < 0 || offsetDeg > 5) return null;
  const sun = dataset.series.sun_el_deg;
  const earth = dataset.series.earth_el_deg;
  const sampleCount = Math.min(sun.length, earth.length);
  if (!sampleCount || sun.slice(0, sampleCount).some((v) => !Number.isFinite(v)) || earth.slice(0, sampleCount).some((v) => !Number.isFinite(v))) return null;
  const roundLikeGeneratedSummary = (value: number) => Math.round(value * 10_000) / 10_000;
  return {
    sunlitFraction: roundLikeGeneratedSummary(sun.slice(0, sampleCount).filter((value) => value > offsetDeg).length / sampleCount),
    earthCenterVisibleFraction: roundLikeGeneratedSummary(earth.slice(0, sampleCount).filter((value) => value > offsetDeg).length / sampleCount),
  };
}
