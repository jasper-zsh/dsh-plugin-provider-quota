// Shared helpers for provider `normalize()` implementations: defensive
// unknown→typed narrowing for third-party JSON payloads.

import type { QuotaDetail } from '../types'

export type UnknownRecord = Record<string, unknown>

export function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? value as UnknownRecord : null
}

export function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** 归一化 `{ limit, used, remaining, resetTime }` 形态的额度块；非对象返回 null。 */
export function detailOf(raw: unknown): QuotaDetail | null {
  const record = asRecord(raw)
  if (record === null) return null
  return {
    limit: toNum(record.limit),
    used: toNum(record.used),
    remaining: toNum(record.remaining),
    resetTime: typeof record.resetTime === 'string' ? record.resetTime : null,
  }
}
