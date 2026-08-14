// OpenAI Codex（ChatGPT 订阅）— GET https://chatgpt.com/backend-api/wham/usage
//
// 接入链与 openai-codex 模型路由相同：profile 的 apiKeyEnv 指向
// CODEX_OAUTH_ACCESS_TOKEN（由 dsh-plugin-llm-codex 负责 OAuth 登录与到期自动
// 刷新），本模块只做只读消费 —— 从 access token 的 JWT 解出 chatgpt-account-id
// 作为查询头。令牌过期时 llm-codex 的排程刷新会恢复，本插件不参与令牌生命周期。
//
// 响应形态：
//   plan_type: 'pro' | ...                                —— 订阅等级
//   rate_limit.primary_window:   { used_percent, … }      —— 主限额窗口（约 5 小时）
//   rate_limit.secondary_window: { used_percent, … }      —— 次限额窗口（约 7 天）
// 窗口用量是百分比；本接口没有独立的"订阅周期额度"概念（usage = null）。

import type { NormalizedQuota, QuotaDetail, QuotaWindow } from '../types'
import { asRecord, toNum } from './helpers'
import type { UnknownRecord } from './helpers'
import type { ProviderDef } from './types'

function decodeJwt(token: string): UnknownRecord | null {
  try {
    const part = token.split('.')[1] || ''
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return asRecord(JSON.parse(Buffer.from(padded, 'base64').toString('utf8')))
  } catch (ignore) {
    return null
  }
}

function accountIdOf(accessToken: string): string {
  const payload = decodeJwt(accessToken)
  const claim = asRecord(payload?.['https://api.openai.com/auth'])
  if (claim && typeof claim.chatgpt_account_id === 'string' && claim.chatgpt_account_id) {
    return claim.chatgpt_account_id
  }
  throw new Error('access token 中未找到 chatgpt_account_id（需经 llm-codex 插件 OAuth 登录获取的 JWT）')
}

function windowOf(raw: unknown, fallbackMinutes: number): QuotaWindow | null {
  const win = asRecord(raw)
  if (win === null) return null
  const used = toNum(win.used_percent)
  if (used === null) return null
  const clamped = Math.min(100, Math.max(0, used))
  const windowSeconds = toNum(win.limit_window_seconds)
  let resetTime: string | null = null
  const resetAfter = toNum(win.reset_after_seconds)
  if (resetAfter !== null) {
    resetTime = new Date(Date.now() + resetAfter * 1000).toISOString()
  } else {
    const resetAt = toNum(win.reset_at)
    if (resetAt !== null) resetTime = new Date(resetAt * 1000).toISOString()
    else if (typeof win.reset_at === 'string' && Number.isFinite(Date.parse(win.reset_at))) resetTime = win.reset_at
  }
  const detail: QuotaDetail = { limit: 100, used: clamped, remaining: 100 - clamped, resetTime }
  return { durationMinutes: windowSeconds !== null ? Math.round(windowSeconds / 60) : fallbackMinutes, detail }
}

function normalize(payload: unknown): NormalizedQuota {
  const root = asRecord(payload)
  const plan = typeof root?.plan_type === 'string' && root.plan_type ? root.plan_type.toLowerCase() : null
  const rate = asRecord(root?.rate_limit)
  const windows: QuotaWindow[] = []
  // ChatGPT 订阅限额窗口语义：主窗口约 5 小时，次窗口约 7 天；字段缺席时用语义回退值
  const primary = windowOf(rate?.primary_window, 300)
  if (primary !== null) windows.push(primary)
  const secondary = windowOf(rate?.secondary_window, 10080)
  if (secondary !== null) windows.push(secondary)
  return { plan, usage: null, windows, balance: null }
}

export const codex: ProviderDef = {
  id: 'openai-codex',
  name: 'OpenAI Codex',
  short: 'Codex',
  settingsNs: 'llm-pi-ai',
  usagesUrl: 'https://chatgpt.com/backend-api/wham/usage',
  headers(key) {
    return { 'chatgpt-account-id': accountIdOf(key), 'user-agent': 'codex-cli' }
  },
  normalize,
}
