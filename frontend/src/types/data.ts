export type EventType = 'sunrise' | 'sunset' | 'earthrise' | 'earthset'

export interface SiteMeta {
  id: string
  name: string
  latitude_deg: number
  longitude_deg_east: number
  radius_km: number
  frame: string
  verified: boolean
  source: string
}

export interface LumenDataset {
  schema_version: string
  site: SiteMeta
  time: {
    start_utc: string
    end_utc: string
    step_s: number
    scale_in: string
    scale_calc: string
  }
  horizon: {
    model: string
    terrain_included: boolean
    mask: null
  }
  series: {
    sun_el_deg: number[]
    sun_az_deg: number[]
    earth_el_deg: number[]
    earth_az_deg: number[]
    earth_radius_deg: number[]
  }
  events: Array<{ type: EventType; utc: string }>
  summary: {
    sunlit_fraction: number
    earth_center_visible_fraction: number
    longest_dark_h: number | null
    longest_earth_outage_h: number | null
  }
  provenance: {
    kernels: Array<{ name: string; path: string; sha256: string }>
    algorithm_commit: string
    algorithm_dirty: boolean
    algorithm_sources: Array<{ path: string; sha256: string }>
    generated_utc: string
    aberration: string
  }
  warnings: string[]
}
