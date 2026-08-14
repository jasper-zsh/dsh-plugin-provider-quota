// The provider extension contract. One ProviderDef per supported provider;
// see kimi.ts for a complete implementation and index.ts for the registry.

import type { NormalizedQuota } from '../types'

export interface ProviderDef {
  /** llm 服务的 provider 路由名（同时是 settings providers 字典键与 llm 路由 id）。 */
  id: string
  /** 浮层卡片标题。 */
  name: string
  /** 徽标上的短名。 */
  short: string
  /** settings 命名空间（该 provider 的 profile 所在处，通常 'llm-pi-ai'）。 */
  settingsNs: string
  /**
   * profile 在 settings 中的形状：
   * - 'providers'（默认）：`settings[settingsNs].providers[id]` —— 如 llm-pi-ai；
   * - 'self'：`settings[settingsNs]` 自身就是 profile —— 如 dsh-llm-deepseek 的
   *   llm-deepseek 命名空间（无该命名空间时，路由激活即按默认凭据展示）。
   */
  settingsShape?: 'providers' | 'self'
  /**
   * profile 未配置 apiKeyEnv 时回退的默认凭据引用（如 DeepSeek 的
   * DEEPSEEK_API_KEY）。该引用同样经 DSH credentials 服务解析。
   */
  defaultApiKeyEnv?: string
  /** 额度/余额查询端点（GET，Bearer 凭证）。 */
  usagesUrl: string
  /**
   * 可选补充端点（GET，Bearer 凭证），键名作为 normalize 第二参数 `extra` 的
   * 键，值为端点 URL。补充端点是尽力而为的：请求失败只影响 `extra` 缺席，
   * 不中止本次查询（如 kimi 的 `/me` 用于取会员等级展示名 `user_level_name`）。
   */
  extraUrls?: Record<string, string>
  /**
   * 额外请求头，按凭证派生（如 codex 从 access token 的 JWT 解出
   * chatgpt-account-id）。抛出异常会中止本次查询并把消息展示为条目错误。
   */
  headers?(key: string): Record<string, string>
  /**
   * 把 provider 的原始响应归一化为插件统一 JSON 形态。`extra` 为各补充端点
   * 成功解析出的 JSON 对象（键名见 `extraUrls`）；请求失败或未配置时缺席。
   */
  normalize(payload: unknown, extra?: Record<string, unknown>): NormalizedQuota
}
