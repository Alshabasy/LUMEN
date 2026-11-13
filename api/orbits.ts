type RequestLike = { method?: string; url?: string };
type ResponseLike = {
  status: (code: number) => ResponseLike;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

type VectorPoint = { utc: string; xAu: number; yAu: number; zAu: number };
type HorizonsPayload = { error?: string; result?: string };

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";
const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function utcMinute(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function parseVectors(payload: HorizonsPayload): VectorPoint[] {
  if (payload.error) throw new Error(payload.error);
  const table = payload.result?.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!table) throw new Error("JPL Horizons returned no orbit vectors.");
  const points: VectorPoint[] = [];
  for (const line of table.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+(?:\.\d+)?,\s*A\.D\.\s+(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2}):\d+(?:\.\d+)?,\s*([-+\d.E]+),\s*([-+\d.E]+),\s*([-+\d.E]+)/);
    if (!match) continue;
    const month = MONTHS[match[2]];
    const coordinates = match.slice(6, 9).map(Number);
    if (!month || coordinates.some((coordinate) => !Number.isFinite(coordinate))) continue;
    points.push({
      utc: `${match[1]}-${month}-${match[3]}T${match[4]}:${match[5]}:00Z`,
      xAu: coordinates[0], yAu: coordinates[1], zAu: coordinates[2],
    });
  }
  if (points.length < 3) throw new Error("Could not parse JPL Horizons orbit vectors.");
  return points;
}

async function fetchVectors(
  target: "301" | "399",
  center: "500@399" | "500@10",
  now: Date,
  spanDays: number,
  step: string,
) {
  const parameters = new URLSearchParams({
    format: "json", COMMAND: target, OBJ_DATA: "NO", MAKE_EPHEM: "YES",
    EPHEM_TYPE: "VECTORS", CENTER: center,
    START_TIME: utcMinute(new Date(now.getTime() - spanDays * 86_400_000)),
    STOP_TIME: utcMinute(new Date(now.getTime() + spanDays * 86_400_000)),
    STEP_SIZE: step, TIME_TYPE: "UT", REF_PLANE: "ECLIPTIC", REF_SYSTEM: "ICRF",
    VEC_TABLE: "1", VEC_CORR: "NONE", OUT_UNITS: "AU-D", CSV_FORMAT: "YES",
  });
  const upstream = await fetch(`${HORIZONS_URL}?${parameters.toString()}`, {
    signal: AbortSignal.timeout(20_000), headers: { Accept: "application/json" },
  });
  if (!upstream.ok) throw new Error(`JPL Horizons returned HTTP ${upstream.status}.`);
  return parseVectors(await upstream.json() as HorizonsPayload);
}

function errorResponse(response: ResponseLike, status: number, message: string) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(status).json({ error: { code: "ORBIT_REQUEST_FAILED", message } });
}

export default async function handler(request: RequestLike, response: ResponseLike) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return errorResponse(response, 405, "Use GET for the current JPL orbit vectors.");
  }
  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url ?? "", "https://lumen.invalid");
  } catch {
    return errorResponse(response, 400, "Request URL is invalid.");
  }
  if ([...requestUrl.searchParams.keys()].length > 0) {
    return errorResponse(response, 400, "The orbit endpoint accepts no query parameters.");
  }
  const now = new Date();
  now.setUTCSeconds(0, 0);
  try {
    const [earthHeliocentric, moonGeocentric] = await Promise.all([
      fetchVectors("399", "500@10", now, 180, "5 d"),
      fetchVectors("301", "500@399", now, 15, "12 h"),
    ]);
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=3600");
    return response.status(200).json({
      epochUtc: now.toISOString(),
      frame: "Ecliptic J2000 / ICRF axes",
      units: "AU",
      correction: "Geometric vectors (VEC_CORR=NONE)",
      earthHeliocentric,
      moonGeocentric,
      source: "NASA/JPL Horizons API · DE441",
    });
  } catch (error) {
    return errorResponse(response, 502, error instanceof Error ? error.message : "JPL orbit vectors are unavailable.");
  }
}
