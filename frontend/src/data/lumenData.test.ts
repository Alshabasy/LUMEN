import { describe, expect, it } from 'vitest'
import { calculateVerdict, eventSampleIndex, formatCountdown, formatPercent, formatUtc, nextEvent, sampleIndex, utcInputSampleIndex, utcInputValue } from './lumenData'
import type { LumenDataset } from '../types/data'

const dataset = {
  time: { start_utc: '2027-01-01T00:00:00Z', end_utc: '2027-01-01T00:30:00Z', step_s: 900 },
  events: [
    { type: 'sunrise', utc: '2027-01-01T00:15:00Z' },
    { type: 'sunset', utc: '2027-01-01T00:30:00Z' },
  ],
  series: { sun_el_deg: [1, 2, 3] },
} as LumenDataset

describe('lumen data helpers', () => {
  it('clamps the cursor to available samples', () => {
    expect(sampleIndex(dataset, -2)).toBe(0)
    expect(sampleIndex(dataset, 1.6)).toBe(2)
    expect(sampleIndex(dataset, 99)).toBe(2)
  })

  it('formats screening fractions as whole percentages', () => {
    expect(formatPercent(0.734)).toBe('73%')
  })

  it('formats generated timestamps in UTC', () => {
    expect(formatUtc('2027-01-01T00:00:00Z')).toContain('Jan 1, 2027')
  })

  it('uses both visible metrics for screening states', () => {
    const thresholds = {
      go_min_sunlit_fraction: 0.6,
      go_min_earth_visible_fraction: 0.7,
      caution_min_sunlit_fraction: 0.3,
      caution_min_earth_visible_fraction: 0.4,
    }
    expect(calculateVerdict({ sunlit_fraction: 0.8, earth_center_visible_fraction: 0.8, longest_dark_h: null, longest_earth_outage_h: null }, thresholds)).toBe('GO')
    expect(calculateVerdict({ sunlit_fraction: 0.8, earth_center_visible_fraction: 0.5, longest_dark_h: null, longest_earth_outage_h: null }, thresholds)).toBe('CAUTION')
    expect(calculateVerdict({ sunlit_fraction: 0.8, earth_center_visible_fraction: 0.2, longest_dark_h: null, longest_earth_outage_h: null }, thresholds)).toBe('NO-GO')
  })

  it('formats the simulated time remaining to a refined transition', () => {
    expect(formatCountdown('2027-01-03T04:05:00Z', '2027-01-01T00:00:00Z')).toBe('2d 4h 5m')
  })

  it('jumps only to future events inside the generated interval', () => {
    expect(nextEvent(dataset, 'sunrise', '2027-01-01T00:00:00Z')?.utc).toBe('2027-01-01T00:15:00Z')
    expect(nextEvent(dataset, 'sunrise', '2027-01-01T00:15:00Z')).toBeNull()
    expect(nextEvent(dataset, 'earthset', '2027-01-01T00:00:00Z')).toBeNull()
  })

  it('interprets the date/time field as UTC and rejects times outside coverage', () => {
    expect(utcInputValue('2027-01-01T00:15:00Z')).toBe('2027-01-01T00:15')
    expect(utcInputSampleIndex(dataset, '2027-01-01T00:16')).toBe(1)
    expect(utcInputSampleIndex(dataset, '2026-12-31T23:59')).toBeNull()
    expect(utcInputSampleIndex(dataset, '2027-01-01T00:31')).toBeNull()
    expect(utcInputSampleIndex(dataset, '2027-02-30T00:00')).toBeNull()
  })

  it('places event jumps at the first sample at or after the refined event', () => {
    expect(eventSampleIndex(dataset, '2027-01-01T00:16:00Z')).toBe(2)
    expect(eventSampleIndex(dataset, '2026-12-31T23:59:00Z')).toBeNull()
  })
})
