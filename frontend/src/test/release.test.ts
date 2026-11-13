import { describe, expect, it, vi } from "vitest"
import horizonsHandler from "../../../api/horizons"
import orbitsHandler from "../../../api/orbits"
import { cachedLiveHorizons } from "../data/liveHorizons"
import { cachedLiveOrbits } from "../data/liveOrbits"

function mockResponse() {
  const state: { status?: number; headers: Record<string, string>; body?: unknown } = { headers: {} }
  const response = {
    status(code: number) { state.status = code; return response },
    setHeader(name: string, value: string) { state.headers[name] = value },
    json(body: unknown) { state.body = body },
  }
  return { response, state }
}

describe("release API contracts and offline snapshots", () => {
  it("rejects arbitrary Horizons query parameters with a structured error", async () => {
    const { response, state } = mockResponse()
    await horizonsHandler({ method: "GET", url: "/api/horizons?site_id=apollo-11&target=10&COMMAND=301" }, response)
    expect(state.status).toBe(400)
    expect(state.body).toMatchObject({ error: { code: "HORIZONS_REQUEST_FAILED" } })
  })

  it("rejects unsupported sites and repeated coordinates before calling upstream", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    const { response, state } = mockResponse()
    await horizonsHandler({ method: "GET", url: "/api/horizons?site_id=unknown&target=10" }, response)
    expect(state.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it("uses only allowlisted Horizons arguments and sets a bounded cache policy", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result: "$$SOE\\nrow\\n$$EOE" }),
    } as Response)
    const { response, state } = mockResponse()
    await horizonsHandler({ method: "GET", url: "/api/horizons?site_id=apollo-11&target=10" }, response)
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(upstreamUrl.searchParams.get("COMMAND")).toBe("10")
    expect(upstreamUrl.searchParams.get("SITE_COORD")).toBe("23.47297,0.67408,0")
    expect(upstreamUrl.searchParams.has("site_id")).toBe(false)
    expect(state.status).toBe(200)
    expect(state.headers["Cache-Control"]).toContain("s-maxage=60")
    fetchMock.mockRestore()
  })

  it("rejects arbitrary orbit query parameters", async () => {
    const { response, state } = mockResponse()
    await orbitsHandler({ method: "GET", url: "/api/orbits?COMMAND=301" }, response)
    expect(state.status).toBe(400)
    expect(state.body).toMatchObject({ error: { code: "ORBIT_REQUEST_FAILED" } })
  })

  it("provides UTC-stamped committed Horizons and orbit fallback snapshots", () => {
    const horizons = cachedLiveHorizons("apollo-11")
    const orbits = cachedLiveOrbits()
    expect(horizons?.isCached).toBe(true)
    expect(horizons?.asOfUtc).toBe("2026-11-13T11:50:00Z")
    expect(orbits.capturedAtUtc).toBe("2026-11-13T11:50:00Z")
    expect(orbits.earthHeliocentric.length).toBeGreaterThan(3)
    expect(orbits.moonGeocentric.length).toBeGreaterThan(3)
  })
})
