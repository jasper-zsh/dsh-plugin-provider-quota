// Data access: the same-origin endpoint registered by the Host half.
//
// 模块级缓存 + 并发去重：dock 槽位是会话级（scope: session），切换会话时
// shell 会按 sessionId 重建徽标组件，组件内 state 全部丢失。额度数据本身是
// provider 级（全局）的，因此把最后一次成功的视图留在模块作用域：重挂载时
// 先渲染缓存（stale-while-revalidate），后台再静默刷新，避免“额度 …”→ 数字
// 的闪烁；并发请求共享同一个 in-flight promise，快速切换会话不会重复打接口。

import type { QuotaView } from '../types'

/** 与 Host 端缓存一致：此窗口内非强制请求直接命中客户端缓存，不发网络请求。 */
const FRESH_MS = 30000
// 客户端请求兜底超时：必须大于 Host 单 provider 兜底（30s）。此前 fetch 无超时，
// 一旦请求挂死（连接半开、服务端异常占住），模块级 inflight 永不 settle，UI 会
// 永远停在「正在同步额度」；超时后请求转为失败态，可自动/手动重试。
const REQUEST_TIMEOUT_MS = 45000

let cached: QuotaView | null = null
let cachedAt = 0
let inflight: Promise<QuotaView> | null = null

/** 最近一次成功的额度视图（无则 null），供组件挂载时初始化 state。 */
export function quotaCache(): QuotaView | null {
  return cached
}

/** 带缓存的加载：非强制且缓存新鲜时直接返回缓存；否则共享同一次请求。 */
export function loadQuota(target?: string | null, force?: boolean): Promise<QuotaView> {
  if (!force && target == null && cached !== null && Date.now() - cachedAt < FRESH_MS) {
    return Promise.resolve(cached)
  }
  if (inflight !== null) return inflight
  inflight = fetchQuota(target, force).then(
    (d) => {
      cached = d
      cachedAt = Date.now()
      inflight = null
      return d
    },
    (err) => {
      inflight = null
      throw err
    },
  )
  return inflight
}

function fetchQuota(target?: string | null, force?: boolean): Promise<QuotaView> {
  let url = '/provider-quota/quota.json'
  const qs: string[] = []
  if (target) qs.push('provider=' + encodeURIComponent(target))
  if (force) qs.push('force=1')
  if (qs.length > 0) url += '?' + qs.join('&')
  return fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return res.json() as Promise<QuotaView>
  })
}
