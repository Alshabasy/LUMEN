import type { LumenDataset } from '../types/data'

export const availableSites = [
  { id: 'apollo-11', name: 'Apollo 11 reference', available: true },
  { id: 'shackleton-rim', name: 'Shackleton rim', available: false },
  { id: 'de-gerlache-rim', name: 'de Gerlache rim', available: false },
  { id: 'malapert-massif', name: 'Malapert massif', available: false },
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
