// The provider extension contract. One ProviderDef per supported provider;
// see kimi.ts for a complete implementation and index.ts for the registry.

import type { NormalizedQuota } from '../types'

export interface ProviderDef {
  /** llm-pi-ai 的 provider 路由名（同时是 settings providers 字典键与 llm 路由 id）。 */
  id: string
  /** 浮层卡片标题。 */
  name: string
  /** 徽标上的短名。 */
  short: string
  /** settings 命名空间（该 provider 的 profile 所在处，通常 'llm-pi-ai'）。 */
  settingsNs: string
  /** 额度查询端点（GET，Bearer 凭证）。 */
  usagesUrl: string
  /**
   * 额外请求头，按凭证派生（如 codex 从 access token 的 JWT 解出
   * chatgpt-account-id）。抛出异常会中止本次查询并把消息展示为条目错误。
   */
  headers?(key: string): Record<string, string>
  /** 把 provider 的原始响应归一化为插件统一 JSON 形态。 */
  normalize(payload: unknown): NormalizedQuota
}
