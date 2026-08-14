// Quota engine: credential resolution, provider querying, and the
// cache/refresh policy behind `GET /provider-quota/quota.json`.
//
// 展示范围 = SUPPORTED 注册表中的 provider 且 harness 的 settings 里为其配置了
// profile。密钥只存在于本进程内存，不写入响应、日志或页面。

import { SUPPORTED } from './providers'
import type { ProviderDef } from './providers'
import { asRecord } from './providers/helpers'
import type { UnknownRecord } from './providers/helpers'
import type { CredentialsService, LlmService, SettingsService } from './services'
import type { NormalizedQuota, ProviderEntry, QuotaView } from './types'

const CACHE_MS = 30000
const FETCH_TIMEOUT_MS = 20000

export interface QuotaQuery {
  /** 指定 id 时精准刷新该 provider（绕过缓存）；否则按缓存策略返回全量视图。 */
  provider: string | null
  /** 绕过 30 秒缓存强制全量刷新。 */
  force: boolean
}

export interface QuotaResponder {
  respond(query: QuotaQuery): Promise<QuotaView>
}

/** 引擎依赖的三个 harness 服务（由入口从 inject 后的 ctx 注入）。 */
export interface QuotaDeps {
  settings: SettingsService
  credentials: CredentialsService
  llm: LlmService
}

export function createQuotaResponder(deps: QuotaDeps): QuotaResponder {
  const { settings, credentials, llm } = deps

  let cacheAt = 0
  let cacheData: QuotaView | null = null
  let inflight: Promise<QuotaView> | null = null

  async function queryProvider(def: ProviderDef, key: string): Promise<NormalizedQuota> {
    const res = await fetch(def.usagesUrl, {
      headers: {
        authorization: 'Bearer ' + key,
        accept: 'application/json',
        ...(def.headers !== undefined ? def.headers(key) : {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const body = await res.text()
    if (!res.ok) {
      let extra = ''
      try {
        const j = asRecord(JSON.parse(body))
        if (j !== null) {
          const errObj = asRecord(j.error)
          const m = j.message || (j.error ? errObj?.message || j.error : undefined) || j.code
          if (typeof m === 'string' && m) extra = '：' + m.slice(0, 120)
          else if (typeof m === 'number') extra = '：code ' + m
        }
      } catch (ignore) {}
      throw new Error('接口返回 HTTP ' + res.status + extra)
    }
    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch (ignore) {
      throw new Error('响应不是有效 JSON')
    }
    return def.normalize(payload)
  }

  function activeRoutes(): Record<string, boolean> {
    const active: Record<string, boolean> = {}
    try {
      for (const p of llm.listProviders()) {
        if (p && typeof p.id === 'string') active[p.id] = true
      }
    } catch (ignore) {}
    return active
  }

  function configuredProfile(def: ProviderDef): UnknownRecord | null {
    try {
      const ns = asRecord(settings.get(def.settingsNs))
      // 'self' 型 provider（如 dsh-llm-deepseek 的 llm-deepseek 命名空间）：
      // 命名空间自身就是 profile，不是 providers 字典项
      if (def.settingsShape === 'self') return ns
      const providers = asRecord(ns?.providers)
      if (providers !== null) return asRecord(providers[def.id])
    } catch (ignore) {}
    return null
  }

  // 构建单个 provider 的额度条目；该 provider 未在 harness 配置时返回 null
  async function buildEntry(def: ProviderDef, active: Record<string, boolean>): Promise<ProviderEntry | null> {
    const routeActive = active[def.id] === true
    // 'self' 型 provider 没有 providers 字典项：settings 命名空间缺席时，
    // 路由激活即视为已配置（用 defaultApiKeyEnv 展示）
    let profile = configuredProfile(def)
    if (profile === null && def.settingsShape === 'self' && routeActive) profile = {}
    if (profile === null) return null
    const entry: ProviderEntry = {
      id: def.id,
      name: def.name,
      short: def.short,
      routeActive,
      state: 'error',
      quota: null,
      error: null,
      fetchedAt: new Date().toISOString(),
    }
    const ref = typeof profile.apiKeyEnv === 'string' && profile.apiKeyEnv.trim()
      ? profile.apiKeyEnv.trim()
      : def.defaultApiKeyEnv ?? ''
    if (!ref) {
      entry.error = '该 provider 未配置 apiKeyEnv 凭证引用（可能为 OAuth 登录，暂不支持额度查询）'
      return entry
    }
    let key: string | null = null
    try {
      const resolved = await credentials.resolve(ref)
      if (resolved && typeof resolved.value === 'string' && resolved.value.trim()) key = resolved.value.trim()
    } catch (err) {
      entry.error = '凭证 ' + ref + ' 解析失败'
      return entry
    }
    if (key === null) {
      entry.error = '凭证 ' + ref + ' 未配置（环境变量与凭证存储中均无值）'
      return entry
    }
    try {
      entry.quota = await queryProvider(def, key)
      entry.state = 'ok'
    } catch (err) {
      entry.error = err instanceof Error && err.message ? String(err.message) : '查询失败'
    }
    return entry
  }

  function view(providers: ProviderEntry[]): QuotaView {
    return { fetchedAt: new Date().toISOString(), supported: SUPPORTED.map((d) => d.id), providers }
  }

  async function collect(): Promise<QuotaView> {
    const active = activeRoutes()
    const providers: ProviderEntry[] = []
    for (const def of SUPPORTED) {
      const entry = await buildEntry(def, active)
      if (entry !== null) providers.push(entry)
    }
    return view(providers)
  }

  async function fullRefresh(): Promise<QuotaView> {
    if (inflight !== null) return inflight
    const pending = collect()
    inflight = pending
    try {
      const data = await pending
      cacheAt = Date.now()
      cacheData = data
      return data
    } finally {
      inflight = null
    }
  }

  // 精准刷新单个 provider：绕过缓存重查该 provider，合并进缓存列表返回全量视图
  async function targetedRefresh(id: string): Promise<QuotaView> {
    const def = SUPPORTED.find((d) => d.id === id)
    if (def === undefined) return cacheData !== null ? cacheData : fullRefresh()
    if (cacheData === null) return fullRefresh()
    const entry = await buildEntry(def, activeRoutes())
    if (entry === null) return cacheData
    const providers: ProviderEntry[] = []
    let found = false
    for (const p of cacheData.providers) {
      if (p.id === id) { providers.push(entry); found = true } else providers.push(p)
    }
    if (!found) providers.push(entry)
    cacheData = view(providers)
    cacheAt = Date.now()
    return cacheData
  }

  return {
    respond(query) {
      if (query.provider !== null) return targetedRefresh(query.provider)
      if (!query.force && cacheData !== null && Date.now() - cacheAt < CACHE_MS) return Promise.resolve(cacheData)
      return fullRefresh()
    },
  }
}
