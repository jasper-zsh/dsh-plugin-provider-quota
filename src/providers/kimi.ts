// Kimi For Coding — GET https://api.kimi.com/coding/v1/usages
//
// 响应形态：
//   usage:  { limit, used, remaining, resetTime }          —— 订阅周期额度（百分比）
//   limits: [{ window: { duration, timeUnit }, detail }]   —— 限额窗口（5 小时等）
//   user.membership.level: 'LEVEL_*'                       —— 会员等级内部枚举码
//
// 会员等级展示名：`user.membership.level` 是内部 proto 枚举（LEVEL_BASIC /
// LEVEL_INTERMEDIATE / …），不是面向用户的档位名；真实档位名（Andante /
// Moderato / Allegretto / Allegro / Vivace 等音乐术语）由 `/me` 接口以
// `user_level_name` 字段直接下发。因此额外请求 GET /coding/v1/me（extraUrls
// 的 me 键），优先展示 `user_level_name`；只有该请求失败或字段缺席时才回退到
// 标题化的 LEVEL_* 枚举码。

import type { NormalizedQuota, QuotaWindow } from '../types'
import { asRecord, detailOf, toNum } from './helpers'
import type { ProviderDef } from './types'

// 'LEVEL_FREE_FRESHMAN' → 'Free Freshman'；空串、非 LEVEL_ 前缀或占位枚举
// （UNSPECIFIED / ANONYMOUS）返回 null（不展示）
function levelLabel(level: string): string | null {
  const cleaned = level.replace(/^LEVEL_/, '').replace(/_/g, ' ').trim()
  if (!cleaned) return null
  if (cleaned === 'UNSPECIFIED' || cleaned === 'ANONYMOUS') return null
  return cleaned.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

function normalize(payload: unknown, extra?: Record<string, unknown>): NormalizedQuota {
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
  // 优先取 /me 下发的展示名（后端维护，与 kimi.com 控制台一致）
  const me = asRecord(extra?.me)
  const levelName = typeof me?.user_level_name === 'string' ? me.user_level_name.trim() : ''
  if (levelName) {
    plan = levelName
  } else {
    const membership = asRecord(asRecord(root?.user)?.membership)
    if (typeof membership?.level === 'string' && membership.level) {
      plan = levelLabel(membership.level)
    }
  }
  return { plan, usage, windows, balance: null }
}

export const kimi: ProviderDef = {
  id: 'kimi-coding',
  name: 'Kimi For Coding',
  short: 'Kimi',
  settingsNs: 'llm-pi-ai',
  usagesUrl: 'https://api.kimi.com/coding/v1/usages',
  extraUrls: { me: 'https://api.kimi.com/coding/v1/me' },
  normalize,
}
