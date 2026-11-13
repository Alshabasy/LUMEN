import type { EventType, LumenDataset } from '../types/data'

export const availableSites = [
  { id: 'apollo-11', name: 'Apollo 11 reference', available: true },
  { id: 'apollo-12', name: 'Apollo 12 reference', available: true },
  { id: 'shackleton-rim', name: 'Shackleton rim', available: true },
  { id: 'de-gerlache-rim', name: 'de Gerlache Rim 1', available: true },
  { id: 'malapert-massif', name: 'Malapert Massif', available: true },
]

export async function loadDataset(siteId: string): Promise<LumenDataset> {
  const response = await fetch(`/data/${siteId}.json`)
  if (!response.ok) {
    throw new Error(
      `No generated dataset is available for ${siteId}. Run the SPICE precompute pipeline first.`,
    )
  }
  return (await response.json()) as LumenDataset
}

export function sampleIndex(dataset: LumenDataset, cursor: number): number {
  return Math.min(dataset.series.sun_el_deg.length - 1, Math.max(0, Math.round(cursor)))
}

export function nextEvent(
  dataset: LumenDataset,
  eventType: EventType,
  cursorUtc: string,
): LumenDataset['events'][number] | null {
  const cursorMs = Date.parse(cursorUtc)
  const startMs = Date.parse(dataset.time.start_utc)
  const endMs = Date.parse(dataset.time.end_utc)
  return dataset.events.find((event) => {
    const eventMs = Date.parse(event.utc)
    return event.type === eventType && eventMs > cursorMs && eventMs >= startMs && eventMs <= endMs
  }) ?? null
}

export function utcInputValue(utc: string): string {
  return new Date(utc).toISOString().slice(0, 16)
}

export function utcInputSampleIndex(dataset: LumenDataset, value: string): number | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  const requestedMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  const requestedDate = new Date(requestedMs)
  if (
    requestedDate.getUTCFullYear() !== Number(year) ||
    requestedDate.getUTCMonth() !== Number(month) - 1 ||
    requestedDate.getUTCDate() !== Number(day) ||
    requestedDate.getUTCHours() !== Number(hour) ||
    requestedDate.getUTCMinutes() !== Number(minute)
  ) return null
  const startMs = Date.parse(dataset.time.start_utc)
  const endMs = Date.parse(dataset.time.end_utc)
  if (!Number.isFinite(requestedMs) || requestedMs < startMs || requestedMs > endMs) return null
  return sampleIndex(dataset, (requestedMs - startMs) / (dataset.time.step_s * 1000))
}

export function eventSampleIndex(dataset: LumenDataset, eventUtc: string): number | null {
  const eventMs = Date.parse(eventUtc)
  const startMs = Date.parse(dataset.time.start_utc)
  const endMs = Date.parse(dataset.time.end_utc)
  if (!Number.isFinite(eventMs) || eventMs < startMs || eventMs > endMs) return null
  const offsetSamples = (eventMs - startMs) / (dataset.time.step_s * 1000)
  return sampleIndex(dataset, Math.ceil(offsetSamples))
}

export function formatUtc(utc: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(utc))
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export interface VerdictThresholds {
  go_min_sunlit_fraction: number
  go_min_earth_visible_fraction: number
  caution_min_sunlit_fraction: number
  caution_min_earth_visible_fraction: number
}

export function calculateVerdict(
  summary: LumenDataset['summary'],
  thresholds: VerdictThresholds,
): 'GO' | 'CAUTION' | 'NO-GO' {
  if (
    summary.sunlit_fraction >= thresholds.go_min_sunlit_fraction &&
    summary.earth_center_visible_fraction >= thresholds.go_min_earth_visible_fraction
  ) {
    return 'GO'
  }
  if (
    summary.sunlit_fraction < thresholds.caution_min_sunlit_fraction ||
    summary.earth_center_visible_fraction < thresholds.caution_min_earth_visible_fraction
  ) {
    return 'NO-GO'
  }
  return 'CAUTION'
}

export function formatCountdown(eventUtc: string, cursorUtc: string): string {
  const remainingSeconds = Math.max(
    0,
    Math.floor((new Date(eventUtc).getTime() - new Date(cursorUtc).getTime()) / 1000),
  )
  const days = Math.floor(remainingSeconds / 86_400)
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600)
  const minutes = Math.floor((remainingSeconds % 3_600) / 60)
  return [days > 0 ? `${days}d` : '', hours > 0 || days > 0 ? `${hours}h` : '', `${minutes}m`]
    .filter(Boolean)
    .join(' ')
}
