import type { LumenDataset } from "../types/data";

export const SCHEDULE_WINDOW_DAYS = 7;
const WINDOW_SECONDS = SCHEDULE_WINDOW_DAYS * 24 * 60 * 60;

export interface ScenarioMetrics {
  startUtc: string;
  endUtc: string;
  sunlitFraction: number;
  earthCenterVisibleFraction: number;
  longestDarkHours: number;
  longestEarthOutageHours: number;
  sampleCount: number;
}

export function computeScenarioMetrics(
  dataset: LumenDataset,
  requestedStartUtc: string,
): ScenarioMetrics | null {
  const stepMs = dataset.time.step_s * 1000;
  const length = Math.min(
    dataset.series.sun_el_deg.length,
    dataset.series.earth_el_deg.length,
  );
  const samplesPerWindow = Math.floor(WINDOW_SECONDS / dataset.time.step_s);
  if (!stepMs || length < samplesPerWindow || samplesPerWindow < 1) return null;

  const datasetStartMs = Date.parse(dataset.time.start_utc);
  const requestedMs = Date.parse(requestedStartUtc);
  if (!Number.isFinite(datasetStartMs) || !Number.isFinite(requestedMs)) return null;
  const maxStartIndex = length - samplesPerWindow;
  const startIndex = Math.max(
    0,
    Math.min(maxStartIndex, Math.round((requestedMs - datasetStartMs) / stepMs)),
  );
  const endExclusive = startIndex + samplesPerWindow;
  const sun = dataset.series.sun_el_deg.slice(startIndex, endExclusive);
  const earth = dataset.series.earth_el_deg.slice(startIndex, endExclusive);
  if (sun.some((value) => !Number.isFinite(value)) || earth.some((value) => !Number.isFinite(value))) return null;

  const longestRunHours = (values: number[]) => {
    let current = 0;
    let longest = 0;
    for (const value of values) {
      if (value <= 0) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    return (longest * dataset.time.step_s) / 3600;
  };
  const startMs = datasetStartMs + startIndex * stepMs;
  const endMs = startMs + samplesPerWindow * stepMs;
  const toIso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");

  return {
    startUtc: toIso(startMs),
    endUtc: toIso(endMs),
    sunlitFraction: sun.filter((value) => value > 0).length / samplesPerWindow,
    earthCenterVisibleFraction: earth.filter((value) => value > 0).length / samplesPerWindow,
    longestDarkHours: longestRunHours(sun),
    longestEarthOutageHours: longestRunHours(earth),
    sampleCount: samplesPerWindow,
  };
}

export function utcDateInput(value: string): string {
  return value.slice(0, 10);
}

export function utcDateInputStart(value: string): string {
  return `${value}T00:00:00Z`;
}

export function latestScenarioDate(dataset: LumenDataset): string {
  const latestStartMs = Date.parse(dataset.time.end_utc) - WINDOW_SECONDS * 1000;
  return utcDateInput(new Date(latestStartMs).toISOString());
}

export function secondScenarioDate(dataset: LumenDataset): string {
  const desiredMs = Date.parse(dataset.time.start_utc) + 30 * 24 * 60 * 60 * 1000;
  const latestMs = Date.parse(latestScenarioDate(dataset) + "T00:00:00Z");
  return utcDateInput(new Date(Math.min(desiredMs, latestMs)).toISOString());
}
