// Shared wire types for `GET /provider-quota/quota.json` — the single JSON
// shape the Host half produces and the Web client consumes.

/** One quota detail block (limit/used/remaining/resetTime), null-tolerant. */
export interface QuotaDetail {
  /** 上限。当前支持的 provider（kimi-coding）恒为 100 —— 三个数值字段均为百分比而非次数。 */
  limit: number | null
  used: number | null
  remaining: number | null
  resetTime: string | null
}

/** One rate-limit window with its quota detail. */
export interface QuotaWindow {
  /** Window length normalized to minutes; null when the API gives no usable duration. */
  durationMinutes: number | null
  detail: QuotaDetail
}

/** Normalized per-provider quota, produced by each provider's `normalize()`. */
export interface NormalizedQuota {
  /** Membership level lowercased (e.g. "pro"); null when unknown. */
  plan: string | null
  /** Subscription-cycle quota; null when the API omits it. */
  usage: QuotaDetail | null
  windows: QuotaWindow[]
}

/** Per-provider entry in the quota view. */
export interface ProviderEntry {
  id: string
  name: string
  short: string
  /** Whether this provider is an active route in the harness llm service. */
  routeActive: boolean
  state: 'ok' | 'error'
  quota: NormalizedQuota | null
  error: string | null
  fetchedAt: string
}

/** The full quota.json response body. */
export interface QuotaView {
  fetchedAt: string
  /** 插件支持的 provider id 列表（providers/ 注册表），供 client 空态提示使用。 */
  supported: string[]
  providers: ProviderEntry[]
}
