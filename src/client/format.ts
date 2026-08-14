// Pure formatting and selection helpers — no React, no fetch, no cordis.

import type { QuotaDetail, QuotaWindow } from '../types'
import type { SessionSnapshot } from './services'

export type Level = 'high' | 'mid' | 'low'

// 额度数值是百分比（kimi usages 接口 limit 恒为 100），不是次数
export function fmtPct(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : String(n) + '%'
}

// 货币符号表；未收录的币种回退为 "CODE 金额" 形式
const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: '¥', HKD: 'HK$', CAD: 'C$', AUD: 'A$',
}

export function fmtMoney(n: number | null | undefined, currency: string | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const amount = n.toFixed(2)
  const sym = currency && CURRENCY_SYMBOLS[currency] ? CURRENCY_SYMBOLS[currency] : ''
  return sym ? sym + amount : (currency ? currency + ' ' : '') + amount
}

export function fmtReset(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = t - Date.now()
  if (diff <= 0) return '即将重置'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return mins + ' 分钟后重置'
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  if (hours < 24) return hours + ' 小时' + (rest > 0 ? ' ' + rest + ' 分' : '') + '后重置'
  const days = Math.floor(hours / 24)
  return days + ' 天 ' + (hours % 24) + ' 小时后重置'
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => (n < 10 ? '0' : '') + n
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

export function windowLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '限额窗口'
  if (minutes >= 1440 && minutes % 1440 === 0) return minutes / 1440 + ' 天窗口'
  if (minutes >= 60 && minutes % 60 === 0) return minutes / 60 + ' 小时窗口'
  return minutes + ' 分钟窗口'
}

export function shortWindowLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '窗口'
  if (minutes >= 1440 && minutes % 1440 === 0) return minutes / 1440 + 'd'
  if (minutes >= 60 && minutes % 60 === 0) return minutes / 60 + 'h'
  return minutes + 'm'
}

export function levelOf(d: Partial<QuotaDetail> | null | undefined): Level {
  if (!d || !d.limit) return 'high'
  const remaining = d.remaining === null || d.remaining === undefined ? 0 : d.remaining
  const ratio = remaining / d.limit
  if (ratio <= 0.1) return 'low'
  if (ratio <= 0.35) return 'mid'
  return 'high'
}

export function usedPct(d: Partial<QuotaDetail> | null | undefined): number {
  if (!d || !d.limit) return 0
  const used = d.used === null || d.used === undefined ? 0 : d.used
  return Math.min(100, Math.max(0, (used / d.limit) * 100))
}

// 选最短的限额窗口作为徽标上的主窗口（如 5 小时窗口）
export function primaryWindow(windows: QuotaWindow[]): QuotaWindow | null {
  let best: QuotaWindow | null = null
  for (const w of windows) {
    if (!w || !w.detail) continue
    if (best === null) { best = w; continue }
    const a = best.durationMinutes
    const b = w.durationMinutes
    if (a === null || a === undefined || (b !== null && b !== undefined && b < a)) best = w
  }
  return best
}

// 从会话快照中找最后一条 assistant 节点，取其实际使用的 provider 路由
// （provenance 为完成请求的稳定身份；中断冻结的节点只有 requestConfig）
export function lastTurnProvider(session: SessionSnapshot | undefined): string | null {
  if (!session || !Array.isArray(session.nodes)) return null
  for (let i = session.nodes.length - 1; i >= 0; i--) {
    const n = session.nodes[i]
    if (!n || n.kind !== 'assistant') continue
    if (n.provenance && typeof n.provenance.provider === 'string' && n.provenance.provider) return n.provenance.provider
    if (n.requestConfig && typeof n.requestConfig.provider === 'string' && n.requestConfig.provider) return n.requestConfig.provider
  }
  return null
}
