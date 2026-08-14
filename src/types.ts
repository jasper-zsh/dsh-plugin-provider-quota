// Shared wire types for `GET /provider-quota/quota.json` — the single JSON
// shape the Host half produces and the Web client consumes.

/** One quota detail block (limit/used/remaining/resetTime), null-tolerant. */
export interface QuotaDetail {
  /** 上限。百分比型 provider（如 kimi-coding）恒为 100 —— 三个数值字段均为百分比而非次数。 */
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

/** One currency balance entry (e.g. DeepSeek `/user/balance`). */
export interface BalanceEntry {
  /** ISO 4217 货币代码，如 CNY / USD。 */
  currency: string
  /** 账户总余额（赠送 + 充值），字符串金额解析后的数值。 */
  total: number
  /** 未过期赠送余额；接口未提供时为 null。 */
  granted: number | null
  /** 充值余额；接口未提供时为 null。 */
  toppedUp: number | null
}

/** Monetary account balance (currency-based, not percentage-based). */
export interface BalanceInfo {
  /** 账户余额是否足以继续调用（如 DeepSeek 的 is_available）；未知为 null。 */
  available: boolean | null
  /** 各币种余额，保留接口返回顺序。 */
  entries: BalanceEntry[]
}

/** Normalized per-provider quota, produced by each provider's `normalize()`. */
export interface NormalizedQuota {
  /**
   * 订阅等级展示名（如 kimi 的 "Moderato" / "Allegro"）；由 provider 决定
   * 来源与回退策略（kimi 优先取 /me 的 user_level_name，回退到标题化的
   * LEVEL_* 枚举码）。null 表示未知。
   */
  plan: string | null
  /** Subscription-cycle quota; null when the API omits it. */
  usage: QuotaDetail | null
  windows: QuotaWindow[]
  /** 货币化账户余额（如 DeepSeek）；无余额概念的 provider 为 null。 */
  balance: BalanceInfo | null
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
