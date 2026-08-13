// Kimi For Coding — GET https://api.kimi.com/coding/v1/usages
//
// 响应形态：
//   usage:  { limit, used, remaining, resetTime }          —— 订阅周期额度（百分比）
//   limits: [{ window: { duration, timeUnit }, detail }]   —— 限额窗口（5 小时等）
//   user.membership.level: 'LEVEL_*'                       —— 会员等级

import type { NormalizedQuota, QuotaWindow } from '../types'
import { asRecord, detailOf, toNum } from './helpers'
import type { ProviderDef } from './types'

function normalize(payload: unknown): NormalizedQuota {
  const root = asRecord(payload)
  const usage = detailOf(root?.usage)
  const windows: QuotaWindow[] = []
  const rawLimits = root?.limits
  const limits = Array.isArray(rawLimits) ? rawLimits : []
  for (const item of limits) {
    const record = asRecord(item)
    const detail = detailOf(record?.detail)
    if (detail === null) continue
    const win = asRecord(record?.window)
    const duration = toNum(win?.duration)
    let minutes: number | null = null
    if (duration !== null) {
      if (win?.timeUnit === 'TIME_UNIT_MINUTE') minutes = duration
      else if (win?.timeUnit === 'TIME_UNIT_HOUR') minutes = duration * 60
      else if (win?.timeUnit === 'TIME_UNIT_SECOND') minutes = Math.round(duration / 60)
    }
    windows.push({ durationMinutes: minutes, detail })
  }
  let plan: string | null = null
  const membership = asRecord(asRecord(root?.user)?.membership)
  if (typeof membership?.level === 'string' && membership.level) {
    plan = membership.level.replace(/^LEVEL_/, '').toLowerCase()
  }
  return { plan, usage, windows }
}

export const kimi: ProviderDef = {
  id: 'kimi-coding',
  name: 'Kimi For Coding',
  short: 'Kimi',
  settingsNs: 'llm-pi-ai',
  usagesUrl: 'https://api.kimi.com/coding/v1/usages',
  normalize,
}
