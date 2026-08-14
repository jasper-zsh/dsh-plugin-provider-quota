// DeepSeek API — GET https://api.deepseek.com/user/balance
//
// 路由：`deepseek-official`（由 DSH 自带的 dsh-llm-deepseek 插件注册，pi-ai 的
// 通用 `deepseek` 路由不是本 harness 使用的那个）。其配置在 `llm-deepseek`
// settings 命名空间（settingsShape 'self'），apiKeyEnv 缺省回退 DEEPSEEK_API_KEY。
// 因此无需在 llm-pi-ai.providers 中配置 —— 路由激活即展示，默认凭据可解析即可。
//
// 余额是货币金额而不是百分比订阅额度：normalize 产出 plan = null、usage = null、
// windows = []，数据放入 balance 字段，由 client 以货币形式渲染（徽标头条显示
// 首个币种余额，详情列出全部币种与赠送/充值明细）。
//
// 响应形态（api-docs.deepseek.com/api/get-user-balance）：
//   is_available: boolean                  —— 余额是否足够继续调用
//   balance_infos: [{
//     currency: 'CNY' | 'USD'
//     total_balance: '110.00'              —— 总余额（字符串金额）
//     granted_balance: '10.00'             —— 未过期赠送余额
//     topped_up_balance: '100.00'          —— 充值余额
//   }]

import type { BalanceEntry, BalanceInfo, NormalizedQuota } from '../types'
import { asRecord, toNum } from './helpers'
import type { ProviderDef } from './types'

function normalize(payload: unknown): NormalizedQuota {
  const root = asRecord(payload)
  const entries: BalanceEntry[] = []
  // 当前文档字段为 balance_infos（复数数组）；兼容旧版 balance_info 单对象形态
  const rawList: unknown[] = Array.isArray(root?.balance_infos)
    ? root.balance_infos
    : Array.isArray(root?.balance_info)
      ? root.balance_info
      : root?.balance_info !== null && typeof root?.balance_info === 'object'
        ? [root.balance_info]
        : []
  for (const item of rawList) {
    const record = asRecord(item)
    if (record === null) continue
    const currency = typeof record.currency === 'string' && record.currency ? record.currency : ''
    if (!currency) continue
    const total = toNum(record.total_balance)
    if (total === null) continue
    entries.push({
      currency,
      total,
      granted: toNum(record.granted_balance),
      toppedUp: toNum(record.topped_up_balance),
    })
  }
  const balance: BalanceInfo | null = entries.length > 0
    ? { available: typeof root?.is_available === 'boolean' ? root.is_available : null, entries }
    : null
  return { plan: null, usage: null, windows: [], balance }
}

export const deepseek: ProviderDef = {
  id: 'deepseek-official',
  name: 'DeepSeek API',
  short: 'DeepSeek',
  settingsNs: 'llm-deepseek',
  settingsShape: 'self',
  defaultApiKeyEnv: 'DEEPSEEK_API_KEY',
  usagesUrl: 'https://api.deepseek.com/user/balance',
  normalize,
}
