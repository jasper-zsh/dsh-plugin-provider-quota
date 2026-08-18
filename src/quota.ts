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
// 补充端点（extraUrls）的超时比主额度接口更短：它只是 enrichment，
// 失败不应拖慢整个额度视图。
const EXTRA_TIMEOUT_MS = 5000
// 单个 provider 全流程（凭证解析 + 主查询 + 补充端点）的兜底上限。覆盖
// fetch 自身超时之外的挂死路径（如凭证服务阻塞）：超时降级为该 provider
// 的错误条目，绝不拖住整个视图。
const PROVIDER_TIMEOUT_MS = 30000

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

  // 尽力而为地拉取补充端点（如 kimi 的 /me）：任何一个失败（HTTP 错误、
  // 超时、非 JSON）都只让对应键缺席，不中止主查询。
  async function fetchExtra(def: ProviderDef, key: string): Promise<Record<string, unknown>> {
    const extra: Record<string, unknown> = {}
    for (const [name, url] of Object.entries(def.extraUrls ?? {})) {
      try {
        const res = await fetch(url, {
          headers: {
            authorization: 'Bearer ' + key,
            accept: 'application/json',
            ...(def.headers !== undefined ? def.headers(key) : {}),
          },
          signal: AbortSignal.timeout(EXTRA_TIMEOUT_MS),
        })
        if (res.ok) extra[name] = JSON.parse(await res.text())
      } catch (ignore) {}
    }
    return extra
  }

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
    const extra = await fetchExtra(def, key)
    return def.normalize(payload, extra)
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

  function errorEntry(def: ProviderDef, routeActive: boolean, message: string): ProviderEntry {
    return {
      id: def.id,
      name: def.name,
      short: def.short,
      routeActive,
      state: 'error',
      quota: null,
      error: message,
      fetchedAt: new Date().toISOString(),
    }
  }

  // 带兜底超时的 buildEntry：单个 provider 挂死（网络半开、凭证服务阻塞等）
  // 时降级为错误条目，保证全量视图总在 PROVIDER_TIMEOUT_MS 内返回。
  async function buildEntryBounded(def: ProviderDef, active: Record<string, boolean>): Promise<ProviderEntry | null> {
    const task = buildEntry(def, active)
    // 超时后 task 仍在后台继续：挂一个空拒绝处理器，避免未处理拒绝告警。
    task.catch(() => {})
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<ProviderEntry>((resolve) => {
      timer = setTimeout(
        () => resolve(errorEntry(def, active[def.id] === true, '查询超时（超过 ' + Math.round(PROVIDER_TIMEOUT_MS / 1000) + ' 秒）')),
        PROVIDER_TIMEOUT_MS,
      )
    })
    try {
      return await Promise.race([task, timeout])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  // 全量刷新并行查询所有 provider：串行时一个慢 provider（20s 主查询 +
  // 5s 补充端点）会阻塞后面全部 provider，多 provider 超时叠加曾导致首载
  // 长时间停在「正在同步额度」；并行后最坏耗时 ≈ 单个 provider 的兜底上限。
  async function collect(): Promise<QuotaView> {
    const active = activeRoutes()
    const entries = await Promise.all(SUPPORTED.map((def) => buildEntryBounded(def, active)))
    const providers: ProviderEntry[] = []
    for (const entry of entries) if (entry !== null) providers.push(entry)
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
    const entry = await buildEntryBounded(def, activeRoutes())
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
