import fallbackFixture from "./fixtures/orbits-fallback.json"

export interface OrbitVectorPoint {
  utc: string
  xAu: number
  yAu: number
  zAu: number
}

export interface LiveOrbitData {
  epochUtc: string
  frame: string
  units: "AU"
  correction: string
  earthHeliocentric: OrbitVectorPoint[]
  moonGeocentric: OrbitVectorPoint[]
  source: string
  capturedAtUtc?: string
}

export function cachedLiveOrbits(): LiveOrbitData {
  return fallbackFixture as LiveOrbitData
}

export async function fetchLiveOrbits(signal?: AbortSignal): Promise<LiveOrbitData> {
  const response = await fetch("/api/orbits", { signal });
  if (!response.ok) {
    let message = `JPL orbit request failed (HTTP ${response.status}).`;
    try {
      const payload = await response.json() as { error?: string | { message?: string } };
      const detail = typeof payload.error === "string" ? payload.error : payload.error?.message
      if (detail) message = detail;
    } catch { /* Keep the actionable HTTP message. */ }
    throw new Error(message);
  }
  return await response.json() as LiveOrbitData;
}

