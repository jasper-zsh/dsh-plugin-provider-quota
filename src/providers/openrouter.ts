// OpenRouter — GET https://openrouter.ai/api/v1/credits
//
// 路由：`openrouter`（由 DSH 自带的 dsh-llm-pi-ai 目录注册），配置在
// `llm-pi-ai.providers.openrouter`，apiKeyEnv 缺省回退 OPENROUTER_API_KEY。
// 与其余 providers 型路由相同：在 llm-pi-ai.providers 中配置 apiKeyEnv（或
// 依赖进程环境变量）即展示；未配置 providers 字典项时插件不展示该 provider。
//
// OpenRouter 是预购 credit（美元）的余额制账户，非百分比订阅：normalize
// 产出 plan = null、usage = null、windows = []，只填充 balance，由 client
// 以货币形式渲染。OpenRouter 只有单一币种（USD），且不提供赠送/充值细分，
// 因此 BalanceEntry 的 granted / toppedUp 为 null。
//
// 响应形态（openrouter.ai/docs/api-reference/credits）：
//   data.total_credits: 100.0        —— 账户累计充值的 credit（美元）
//   data.total_usage:   9.77         —— 已消耗的 credit（美元）
// 账户可用余额 = total_credits - total_usage（USD）。
//
// 另有一个等价端点 `GET /api/v1/auth/key`（data.limit / data.usage，
// balance = limit - usage），本实现选用 credits 端点，字段语义更直接。

import type { BalanceInfo, NormalizedQuota } from '../types'
import { asRecord, toNum } from './helpers'
import type { ProviderDef } from './types'

function normalize(payload: unknown): NormalizedQuota {
  const root = asRecord(payload)
  const data = asRecord(root?.data)
  const total = toNum(data?.total_credits)
  const used = toNum(data?.total_usage)
  let balance: BalanceInfo | null = null
  if (total !== null && used !== null) {
    // 可用余额 = 累计充值 - 已消耗；防御性下限 0（免费档或透支后余额归零）
    const remaining = Math.max(0, total - used)
    balance = {
      // OpenRouter 不提供 is_available 类标志：余额归零即可视为不可继续调用
      available: remaining > 0,
      entries: [{ currency: 'USD', total: remaining, granted: null, toppedUp: null }],
    }
  }
  return { plan: null, usage: null, windows: [], balance }
}

export const openrouter: ProviderDef = {
  id: 'openrouter',
  name: 'OpenRouter',
  short: 'OpenRouter',
  settingsNs: 'llm-pi-ai',
  defaultApiKeyEnv: 'OPENROUTER_API_KEY',
  usagesUrl: 'https://openrouter.ai/api/v1/credits',
  normalize,
}