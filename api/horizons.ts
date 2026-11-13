type RequestLike = { method?: string; url?: string };
type ResponseLike = {
  status: (code: number) => ResponseLike;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

const SITE_COORDINATES: Record<string, { latitude: number; longitudeEast: number }> = {
  "apollo-11": { latitude: 0.67408, longitudeEast: 23.47297 },
  "apollo-12": { latitude: -3.0128, longitudeEast: -23.4219 },
  "shackleton-rim": { latitude: -89.7668, longitudeEast: -171.87 },
  "de-gerlache-rim": { latitude: -88.6834, longitudeEast: -67.9321 },
  "malapert-massif": { latitude: -85.9948, longitudeEast: -0.23578 },
};

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";

function errorResponse(response: ResponseLike, status: number, message: string) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(status).json({ error: { code: "HORIZONS_REQUEST_FAILED", message } });
}

export default async function handler(request: RequestLike, response: ResponseLike) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return errorResponse(response, 405, "Use GET for current ephemeris.");
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url ?? "", "https://lumen.invalid");
  } catch {
    return errorResponse(response, 400, "Request URL is invalid.");
  }
  const allowed = new Set(["site_id", "target"]);
  if ([...requestUrl.searchParams.keys()].some((key) => !allowed.has(key))) {
    return errorResponse(response, 400, "Only site_id and target parameters are accepted.");
  }
  if (requestUrl.searchParams.getAll("site_id").length !== 1 || requestUrl.searchParams.getAll("target").length !== 1) {
    return errorResponse(response, 400, "Provide exactly one site_id and one target.");
  }
  const siteId = requestUrl.searchParams.get("site_id") ?? "";
  const target = requestUrl.searchParams.get("target") ?? "";
  const site = SITE_COORDINATES[siteId];
  if (!site || (target !== "10" && target !== "399")) {
    return errorResponse(response, 400, "Choose a supported LUMEN site and target.");
  }

  const start = new Date();
  start.setUTCSeconds(0, 0);
  const stop = new Date(start.getTime() + 60_000);
  const utcMinute = (date: Date) => date.toISOString().slice(0, 16).replace("T", " ");
  const parameters = new URLSearchParams({
    format: "json",
    COMMAND: target,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "OBSERVER",
    CENTER: "coord@301",
    COORD_TYPE: "GEODETIC",
    SITE_COORD: `${site.longitudeEast},${site.latitude},0`,
    START_TIME: utcMinute(start),
    STOP_TIME: utcMinute(stop),
    STEP_SIZE: "1m",
    TIME_TYPE: "UT",
    QUANTITIES: "4,13",
    ANG_FORMAT: "DEG",
  });

  try {
    const upstream = await fetch(`${HORIZONS_URL}?${parameters.toString()}`, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    });
    const payload = await upstream.json() as { error?: unknown; result?: unknown };
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    if (!upstream.ok) {
      return errorResponse(response, 502, `JPL Horizons returned HTTP ${upstream.status}.`);
    }
    if (payload.error || typeof payload.result !== "string") {
      return errorResponse(response, 502, "JPL Horizons returned an invalid observer-table response.");
    }
    response.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream request failed.";
    return errorResponse(response, 502, `Could not reach JPL Horizons: ${message}`);
  }
}
