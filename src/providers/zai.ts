// Z.AI GLM Coding Plan — 国际站 api.z.ai / 中国大陆站 open.bigmodel.cn
//
// GET {host}/api/monitor/usage/quota/limit   —— 订阅用量窗口
// GET {host}/api/biz/subscription/list       —— 订阅档位展示名（extraUrls，尽力而为）
//
// 两个站点（pi-ai 路由 `zai` 与 `zai-coding-cn`）的订阅接口共用同一路径与 JSON
// 形态，只有 host 与鉴权头不同：国际站用 `Authorization: Bearer <key>`；大陆站
// open.bigmodel.cn 的 biz/monitor 网关只认裸 API key（无 Bearer 前缀）。引擎默认
// 发送 Bearer 头，但 def.headers(key) 在默认头之后展开，因此 CN 定义用裸 key
// 覆盖 authorization（主端点与 extraUrls 补充端点均适用）。
//
// quota 响应形态（两站一致；字段语义参照 OpenTokenUsage / glm-for-copilot）：
//   code: 200, success: true
//   data.limits: [
//     { type: 'TOKENS_LIMIT', unit: 3, number: 5,     —— 5 小时滚动窗口（session）
//       usage: 800000000, currentValue: 127694464,    —— 窗口 token 上限 / 已消耗
//       remaining: 672305536, percentage: 15,         —— 剩余 token / 已用百分比(0-100)
//       nextResetTime: 1770648402389 }                —— epoch 毫秒
//     { type: 'TOKENS_LIMIT', unit: 6, number: 7, … } —— 7 天滚动窗口（weekly）
//     { type: 'TIME_LIMIT', unit: 5, number: 1, … }   —— 工具调用次数额度（月度），
//   ]                                                   次数语义与百分比展示不匹配，跳过
//   data.planName（部分响应附带档位名，作为 subscription 缺席时的回退）
//
// unit 观测值：3=小时、6=天；其余单位（如月度）不映射时长，窗口标签回退"限额窗口"。
//
// subscription 响应形态：
//   data: [ { productName: 'GLM Coding Max', status: 'VALID', inCurrentPeriod: true,
//             nextRenewTime: '2026-02-12', … } ]
// 取 productName 作为订阅档位展示名（优先 inCurrentPeriod / VALID 条目），经
// tierNameOf 剥掉 "GLM Coding" 产品线前缀后只展示档位（"Max"/"Pro"/"Lite"）。

import type { NormalizedQuota, QuotaWindow } from '../types'
import { asRecord, toNum } from './helpers'
import type { ProviderDef } from './types'

// TOKENS_LIMIT 条目判定：type 或 name 字段（不同网关版本字段名有差异）
function isTokensLimit(record: Record<string, unknown>): boolean {
  const type = typeof record.type === 'string' ? record.type : typeof record.name === 'string' ? record.name : ''
  return type === 'TOKENS_LIMIT'
}

// unit + number → 分钟；仅映射观测到的单位（3=小时、6=天），未知单位返回 null
function durationMinutes(unit: unknown, count: unknown): number | null {
  const n = toNum(count)
  if (n === null) return null
  const u = toNum(unit)
  if (u === 3) return n * 60
  if (u === 6) return n * 1440
  return null
}

// 已用百分比（0-100，保留 1 位小数）：优先接口直接下发的 percentage，
// 缺席时由 currentValue/usage 计算
function usedPercentOf(record: Record<string, unknown>): number | null {
  const pct = toNum(record.percentage)
  let used: number | null = null
  if (pct !== null) used = pct
  else {
    const current = toNum(record.currentValue)
    const total = toNum(record.usage)
    if (current !== null && total !== null && total > 0) used = (current / total) * 100
  }
  if (used === null) return null
  return Math.round(Math.min(100, Math.max(0, used)) * 10) / 10
}

// nextResetTime：接口给 epoch 毫秒；防御性兼容秒级时间戳
function resetTimeOf(record: Record<string, unknown>): string | null {
  const raw = toNum(record.nextResetTime)
  if (raw === null) return null
  const t = new Date(raw > 1e11 ? raw : raw * 1000)
  return Number.isFinite(t.getTime()) ? t.toISOString() : null
}

// 档位短名：剥掉产品线前缀（productName 形如 "GLM Coding Pro"，展示只留档位
// "Pro"/"Lite"/"Max"）；前缀不匹配或剥后为空时原样返回
function tierNameOf(raw: string): string {
  const stripped = raw.replace(/^GLM\s+Coding\s+/i, '').trim()
  return stripped || raw
}

// subscription/list → 档位展示名：优先 inCurrentPeriod 条目，其次 VALID，再次首个
function planOfSubscription(extra?: Record<string, unknown>): string | null {
  const sub = asRecord(extra?.subscription)
  const list = Array.isArray(sub?.data) ? sub.data : []
  let first: string | null = null
  let valid: string | null = null
  let current: string | null = null
  for (const item of list) {
    const record = asRecord(item)
    if (record === null) continue
    const name = typeof record.productName === 'string' ? record.productName.trim() : ''
    if (!name) continue
    if (first === null) first = name
    if (valid === null && record.status === 'VALID') valid = name
    if (current === null && record.inCurrentPeriod === true) current = name
  }
  const chosen = current ?? valid ?? first
  return chosen === null ? null : tierNameOf(chosen)
}

function normalize(payload: unknown, extra?: Record<string, unknown>): NormalizedQuota {
  const root = asRecord(payload)
  // data 可能是 { limits: [...] }，也可能直接是 limits 数组（容忍两种形态）
  const rawData = root?.data
  const holder = asRecord(rawData) ?? root
  const rawLimits: unknown = Array.isArray(rawData) ? rawData : holder?.limits
  const limits: unknown[] = Array.isArray(rawLimits) ? rawLimits : []

  const windows: QuotaWindow[] = []
  for (const item of limits) {
    const record = asRecord(item)
    if (record === null || !isTokensLimit(record)) continue
    const used = usedPercentOf(record)
    if (used === null) continue
    windows.push({
      durationMinutes: durationMinutes(record.unit, record.number),
      detail: { limit: 100, used, remaining: Math.round((100 - used) * 10) / 10, resetTime: resetTimeOf(record) },
    })
  }
  // 会话窗口（5h）排在周窗口（7d）之前；时长未知者靠后
  windows.sort((a, b) => {
    const av = a.durationMinutes
    const bv = b.durationMinutes
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    return av - bv
  })
  if (windows.length === 0) {
    // HTTP 200 但业务失败（如鉴权错误以 code 下发）或非订阅 key：给出可读错误
    const code = toNum(root?.code)
    const message = typeof root?.message === 'string' ? root.message : typeof root?.msg === 'string' ? root.msg : ''
    const detail = code !== null && code !== 200
      ? '（code ' + code + (message ? '：' + message : '') + '）'
      : message ? '（' + message + '）' : ''
    throw new Error('响应中没有可用的订阅额度窗口' + detail)
  }

  let plan = planOfSubscription(extra)
  if (plan === null) {
    // 部分网关在 quota 响应直接附带档位名（字段名有多个历史版本）
    for (const key of ['planName', 'plan', 'plan_type', 'packageName']) {
      const v = holder?.[key]
      if (typeof v === 'string' && v.trim()) {
        plan = tierNameOf(v.trim())
        break
      }
    }
  }
  return { plan, usage: null, windows, balance: null }
}

// 国际站（api.z.ai）：标准 Bearer 鉴权
export const zai: ProviderDef = {
  id: 'zai',
  name: 'Z.AI',
  short: 'Z.AI',
  settingsNs: 'llm-pi-ai',
  defaultApiKeyEnv: 'ZAI_API_KEY',
  usagesUrl: 'https://api.z.ai/api/monitor/usage/quota/limit',
  extraUrls: { subscription: 'https://api.z.ai/api/biz/subscription/list' },
  normalize,
}

// 大陆站（open.bigmodel.cn）：biz/monitor 网关不认 Bearer 前缀，用裸 key 覆盖
export const zaiCn: ProviderDef = {
  id: 'zai-coding-cn',
  name: 'Z.AI Coding CN',
  short: 'Z.AI CN',
  settingsNs: 'llm-pi-ai',
  defaultApiKeyEnv: 'ZAI_CODING_CN_API_KEY',
  usagesUrl: 'https://open.bigmodel.cn/api/monitor/usage/quota/limit',
  extraUrls: { subscription: 'https://open.bigmodel.cn/api/biz/subscription/list' },
  headers(key) {
    return { authorization: key }
  },
  normalize,
}
