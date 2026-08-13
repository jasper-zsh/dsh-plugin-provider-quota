// dsh-plugin-provider-quota — Host half entry.
//
// 展示范围 = providers/ 注册表中的 provider 且 harness 配置里为其配置了可解析的
// apiKeyEnv 凭证。额度查询经 `GET /provider-quota/quota.json` 暴露给浏览器端
// （同源、no-store）。查询/缓存/刷新策略在 quota.ts；provider 扩展点在 providers/。
//
// 四个服务都是硬依赖：额度展示范围 = 配置的 provider（settings）、可解析凭证
// （credentials）、路由激活状态（llm）、端点宿主（webServer），缺一插件就没有意义。
// inject 让本行 PENDING 至四个服务全部就绪（与加载顺序无关），且服务被替换/卸载时
// 本 fiber 随之卸载、服务回归后重载 —— 不会在闭包里固化启动竞态下的 undefined。

import type { Context } from '@deepseek-ai/cordis'
import { createQuotaResponder } from './quota'
import type { QuotaView } from './types'

export const name = 'provider-quota'
export const inject = ['webServer', 'settings', 'credentials', 'llm']

export function apply(ctx: Context) {
  const quota = createQuotaResponder({ settings: ctx.settings, credentials: ctx.credentials, llm: ctx.llm })

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/provider-quota/quota.json',
    async handler(req, res) {
      const json = (status: number, data: QuotaView | { error: string; fetchedAt: string; providers: [] }) => {
        res.statusCode = status
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.setHeader('cache-control', 'no-store')
        res.end(JSON.stringify(data))
      }
      try {
        if (req.method !== 'GET') {
          json(405, { error: 'method not allowed', fetchedAt: new Date().toISOString(), providers: [] })
          return
        }
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        const provider = url.searchParams.get('provider')
        json(200, await quota.respond({
          provider: provider ? provider : null,
          force: url.searchParams.get('force') === '1',
        }))
      } catch (err) {
        ctx.logger.warn('provider-quota: request failed: ' + (err instanceof Error && err.message ? err.message : err))
        json(500, { error: 'internal error', fetchedAt: new Date().toISOString(), providers: [] })
      }
    },
  }))
}
