import fallbackFixture from "./fixtures/live-fallback.json"

export interface HorizonsBodySnapshot {
  azimuthDeg: number
  elevationDeg: number
  angularDiameterDeg: number
}

export interface LiveHorizonsSnapshot {
  siteId: string
  asOfUtc: string
  fetchedAtUtc: string
  sun: HorizonsBodySnapshot
  earth: HorizonsBodySnapshot
  source: "NASA/JPL Horizons API"
  isCached: boolean
}

interface HorizonsResponse {
  error?: string | { code?: string; message?: string }
  result?: string
}

const HORIZONS_ROUTE = "/api/horizons";
type CachedSnapshot = Omit<LiveHorizonsSnapshot, "isCached">
const cachedSites = fallbackFixture.sites as Record<string, CachedSnapshot>

function apiErrorMessage(error: HorizonsResponse["error"]): string | null {
  if (typeof error === "string") return error
  return error?.message ?? null
}

export function cachedLiveHorizons(siteId: string): LiveHorizonsSnapshot | null {
  const site = cachedSites[siteId]
  return site ? { ...site, isCached: true } : null
}

function parseHorizonsRow(payload: HorizonsResponse): {
  asOfUtc: string
  azimuthDeg: number
  elevationDeg: number
  angularDiameterDeg: number
} {
  const apiError = apiErrorMessage(payload.error)
  if (apiError) throw new Error(apiError)
  const result = payload.result;
  if (!result) throw new Error("JPL Horizons returned no ephemeris result.");
  const table = result.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!table) {
    throw new Error("JPL Horizons returned no rows for this UTC minute.");
  }

  const row = table.split(/\r?\n/).find((line) => line.trim());
  const match = row?.match(
    /^\s*(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2})(?:\s+\S+)?\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/,
  );
  if (!match) {
    throw new Error("Could not read the JPL Horizons observer table row.");
  }

  const month = new Map([
    ["Jan", "01"], ["Feb", "02"], ["Mar", "03"], ["Apr", "04"],
    ["May", "05"], ["Jun", "06"], ["Jul", "07"], ["Aug", "08"],
    ["Sep", "09"], ["Oct", "10"], ["Nov", "11"], ["Dec", "12"],
  ]).get(match[2]);
  if (!month) throw new Error("JPL Horizons returned an unknown month.");

  const values = match.slice(6, 9).map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("JPL Horizons returned a non-finite angle.");
  }
  return {
    asOfUtc: `${match[1]}-${month}-${match[3]}T${match[4]}:${match[5]}:00Z`,
    azimuthDeg: values[0],
    elevationDeg: values[1],
    angularDiameterDeg: values[2] / 3600,
  };
}

async function fetchBody(
  siteId: string,
  target: "10" | "399",
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${HORIZONS_ROUTE}?site_id=${encodeURIComponent(siteId)}&target=${target}`,
    { signal },
  );
  if (!response.ok) {
    let message = `JPL Horizons request failed (HTTP ${response.status}).`;
    try {
      const payload = await response.json() as HorizonsResponse;
      message = apiErrorMessage(payload.error) ?? message;
    } catch { /* Keep the actionable HTTP message. */ }
    throw new Error(message);
  }
  return parseHorizonsRow((await response.json()) as HorizonsResponse);
}

export async function fetchLiveHorizons(
  siteId: string,
  signal?: AbortSignal,
): Promise<LiveHorizonsSnapshot> {
  const [sun, earth] = await Promise.all([
    fetchBody(siteId, "10", signal),
    fetchBody(siteId, "399", signal),
  ]);
  if (sun.asOfUtc !== earth.asOfUtc) {
    throw new Error("Sun and Earth snapshots came from different UTC minutes. Refresh to retry.");
  }
  return {
    siteId,
    asOfUtc: sun.asOfUtc,
    fetchedAtUtc: new Date().toISOString(),
    sun,
    earth,
    source: "NASA/JPL Horizons API",
    isCached: false,
  };
}

