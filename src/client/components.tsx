// Presentational components: the sidebar readout and its detail popover.
// 全部渲染由 QuotaView 数据驱动，新增 provider 不需要改动这里。

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { BalanceInfo, ProviderEntry, QuotaDetail, QuotaView, QuotaWindow } from '../types'
import {
  fmtMoney,
  fmtPct,
  fmtReset,
  fmtTime,
  levelOf,
  primaryWindow,
  shortWindowLabel,
  usedPct,
  windowLabel,
} from './format'
import type { Level } from './format'
import { useQuota, useSessionRunning, useTurnEndRefresh } from './hooks'
import type { QuotaState } from './hooks'
import { popoverBus, quotaBus, usePopoverState, useQuotaMirror } from './store'
import type { SessionsService, TimerService } from './services'

function UsageBlock({ label, u }: { label: string; u: QuotaDetail }) {
  const lv = levelOf(u)
  return (
    <div className="dshpq-block">
      <div className="dshpq-block-label">
        <span>{label}</span>
        {u.resetTime ? <span>{fmtReset(u.resetTime)}</span> : null}
      </div>
      <div className="dshpq-nums">
        <span className={'dshpq-remaining lv-' + lv}>{fmtPct(u.remaining)}</span>
        <span className="dshpq-limit">{'周期剩余 · 已用 ' + fmtPct(u.used)}</span>
      </div>
      <div className="dshpq-bar"><i className={'lv-' + lv} style={{ width: usedPct(u) + '%' }} /></div>
    </div>
  )
}

function WindowRow({ w }: { w: QuotaWindow }) {
  const d: Partial<QuotaDetail> = w && w.detail ? w.detail : {}
  const lv = levelOf(d)
  return (
    <div className="dshpq-window-block">
      <div className="dshpq-block-label">
        <span>{windowLabel(w && w.durationMinutes)}</span>
        {d.resetTime ? <span>{fmtReset(d.resetTime)}</span> : null}
      </div>
      <div className="dshpq-window">
        <div className="dshpq-bar"><i className={'lv-' + lv} style={{ width: usedPct(d) + '%' }} /></div>
        <span className="dshpq-window-nums">{'剩余 ' + fmtPct(d.remaining)}</span>
      </div>
    </div>
  )
}

// 货币化余额（如 DeepSeek）：列出每个币种的总余额与赠送/充值明细
function BalanceBlock({ b }: { b: BalanceInfo }) {
  return (
    <div className={'dshpq-balance' + (b.available === false ? ' unavailable' : '')}>
      {b.available === false
        ? <div className="dshpq-balance-warn">账户余额不足，可能无法继续调用</div>
        : null}
      {b.entries.map((e, i) => (
        <div className="dshpq-balance-row" key={'b' + i}>
          <span className="dshpq-balance-currency">{e.currency}</span>
          <span className="dshpq-balance-total">{fmtMoney(e.total, e.currency)}</span>
          <span className="dshpq-balance-sub">
            {'充值 ' + fmtMoney(e.toppedUp, e.currency) + ' · 赠送 ' + fmtMoney(e.granted, e.currency)}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProviderCard({ p }: { p: ProviderEntry }) {
  return (
    <div className="dshpq-card">
      <div className="dshpq-card-head">
        <span className="dshpq-name">{p.name}</span>
        {p.quota && p.quota.plan ? <span className="dshpq-plan">{p.quota.plan}</span> : null}
        {!p.routeActive ? <span className="dshpq-inactive">路由未激活</span> : null}
      </div>
      {p.state !== 'ok' || !p.quota
        ? <div className="dshpq-error">{p.error || '查询失败'}</div>
        : (
          <>
            {p.quota.usage ? <UsageBlock label="订阅周期额度" u={p.quota.usage} /> : null}
            {p.quota.balance ? <BalanceBlock b={p.quota.balance} /> : null}
            {Array.isArray(p.quota.windows) && p.quota.windows.length > 0
              ? (
                <div className="dshpq-windows">
                  {p.quota.windows.map((w, i) => <WindowRow key={'w' + i} w={w} />)}
                </div>
              )
              : null}
          </>
        )}
    </div>
  )
}

function PanelBody({ quota }: { quota: QuotaState }) {
  if (quota.failed && quota.data === null) {
    return (
      <div className="dshpq-panel">
        <div className="dshpq-error">无法查询额度：Host 请求失败</div>
        <div className="dshpq-foot">
          <span />
          <button className="dshpq-refresh" onClick={() => quota.load(null, true)}>重试</button>
        </div>
      </div>
    )
  }
  if (quota.data === null) {
    return (
      <div className="dshpq-panel">
        <div className="dshpq-empty">正在查询订阅额度…</div>
      </div>
    )
  }
  const providers = Array.isArray(quota.data.providers) ? quota.data.providers : []
  const supported = Array.isArray(quota.data.supported) ? quota.data.supported : []
  return (
    <div className="dshpq-panel">
      {providers.length === 0
        ? (
          <div className="dshpq-empty">
            当前没有可展示的 provider。展示范围 = 插件支持（{supported.join('、') || '无'}）且 harness 已配置凭证的
            provider：请确认对应 settings 命名空间（llm-pi-ai）中为该 provider 配置了 apiKeyEnv 且凭证可解析。
          </div>
        )
        : providers.map((p) => <ProviderCard key={p.id} p={p} />)}
      <div className="dshpq-foot">
        <span>{quota.data.fetchedAt ? '更新于 ' + fmtTime(quota.data.fetchedAt) : ''}</span>
        <button
          className="dshpq-refresh"
          disabled={quota.pending}
          onClick={() => { if (!quota.pending) quota.load(null, true) }}
        >
          {quota.pending ? '查询中…' : '刷新'}
        </button>
      </div>
    </div>
  )
}

interface ReadoutMetric {
  key: string
  label: string
  value: string
  lv?: Level
}

interface ReadoutRow {
  key: string
  lv: Level
  name: string
  plan: string | null
  metrics: ReadoutMetric[]
}

// 把 footer 读数拆成「provider 名称 + 右对齐指标」的表格式数据。相比拼接成
// 一整段文本，侧边栏的横向空间可以用于建立稳定的列与视觉层级。
function buildReadout(data: QuotaView): { rows: ReadoutRow[]; tip: string; worst: Level } {
  const providers = Array.isArray(data.providers) ? data.providers : []
  const rows: ReadoutRow[] = []
  const titles: string[] = []
  let worst: Level = 'high'
  const degrade = (lv: Level) => {
    if (lv === 'low') worst = 'low'
    else if (lv === 'mid' && worst === 'high') worst = 'mid'
  }
  for (const p of providers) {
    const name = typeof p.short === 'string' ? p.short : p.name
    const plan = p.quota && typeof p.quota.plan === 'string' && p.quota.plan.trim() ? p.quota.plan.trim() : null
    const wins = p.quota && Array.isArray(p.quota.windows) ? p.quota.windows : []
    const bal = p.quota ? p.quota.balance : null
    const metrics: ReadoutMetric[] = []
    if (plan) titles.push(p.name + ' 订阅等级：' + plan)
    let lv: Level = 'high'
    const rowDegrade = (next: Level) => {
      if (next === 'low') lv = 'low'
      else if (next === 'mid' && lv === 'high') lv = 'mid'
      degrade(next)
    }
    if (p.state === 'ok' && p.quota && (p.quota.usage || wins.length > 0 || (bal && bal.entries.length > 0))) {
      if (p.quota.usage) {
        const u = p.quota.usage
        const metricLevel = levelOf(u)
        metrics.push({ key: 'cycle', label: '周期', value: fmtPct(u.remaining), lv: metricLevel })
        titles.push(p.name + ' 周期额度：剩余 ' + fmtPct(u.remaining) + ' · 已用 ' + fmtPct(u.used) + (u.resetTime ? '（' + fmtReset(u.resetTime) + '）' : ''))
        rowDegrade(metricLevel)
      }
      const win = primaryWindow(wins)
      if (win !== null) {
        const metricLevel = levelOf(win.detail)
        metrics.push({ key: 'window', label: shortWindowLabel(win.durationMinutes), value: fmtPct(win.detail.remaining), lv: metricLevel })
      }
      for (const w of wins) {
        if (!w || !w.detail) continue
        titles.push(p.name + ' ' + windowLabel(w.durationMinutes) + '：剩余 ' + fmtPct(w.detail.remaining) + ' · 已用 ' + fmtPct(w.detail.used) + (w.detail.resetTime ? '（' + fmtReset(w.detail.resetTime) + '）' : ''))
        rowDegrade(levelOf(w.detail))
      }
      if (bal && bal.entries.length > 0) {
        const first = bal.entries[0]
        const balanceLevel: Level = bal.available === false ? 'low' : 'high'
        metrics.push({ key: 'balance', label: '余额', value: fmtMoney(first.total, first.currency), lv: balanceLevel })
        titles.push(p.name + ' 余额：' + fmtMoney(first.total, first.currency) + '（' + first.currency + '）' + (bal.available === false ? ' · 余额不足' : ''))
        if (bal.available === false) rowDegrade('low')
        for (let i = 1; i < bal.entries.length; i++) {
          const e = bal.entries[i]
          titles.push(p.name + ' ' + e.currency + ' 余额：' + fmtMoney(e.total, e.currency))
        }
      }
      rows.push({ key: p.id, lv, name, plan, metrics })
    } else {
      rows.push({ key: p.id, lv: 'mid', name, plan, metrics: [{ key: 'error', label: '', value: '暂不可用', lv: 'mid' }] })
      titles.push(p.name + '：' + (p.error || '查询失败'))
      degrade('mid')
    }
  }
  const tip = titles.join('\n') + (data.fetchedAt ? '\n更新于 ' + fmtTime(data.fetchedAt) : '') + '\n点击查看详情'
  return { rows, tip, worst }
}

function SideHeader({ pending }: { pending: boolean }) {
  return (
    <span className="dshpq-side-head">
      <span className="dshpq-side-title">Provider quota</span>
      <span className="dshpq-side-hint">{pending ? '更新中' : '详情'} <span aria-hidden="true">⌃</span></span>
    </span>
  )
}

// 侧边栏底部读数（sidebar.footer.action，root 作用域）：展开态是占满槽位宽度的
// 紧凑表格，收起态保留一个状态圆点；点击打开详情浮层。root 作用域不会因会话
// 切换重挂载，模块级缓存 + 静默刷新保证数字原地更新。
export function QuotaFooter({ wide, timer, sessions }: {
  wide: boolean
  timer: TimerService | undefined
  sessions: SessionsService | undefined
}) {
  const quota = useQuota(300000, timer)
  const running = useSessionRunning(sessions)
  useTurnEndRefresh(quota.refresh, running, timer)
  const { open } = usePopoverState()
  const btnRef = useRef<HTMLButtonElement>(null)

  // 把 useQuota 状态镜像给浮层入口（load/refresh 经 useCallback 稳定，仅在数据变化时发布）
  useEffect(() => {
    quotaBus.set(quota)
  }, [quota.data, quota.pending, quota.failed, quota.load, quota.refresh])

  // 浮层打开期间窗口尺寸变化（含侧边栏拖拽）时重新测量锚点
  useEffect(() => {
    if (!open) return undefined
    const onResize = () => {
      const r = btnRef.current ? btnRef.current.getBoundingClientRect() : null
      if (r) popoverBus.set(true, { top: r.top, left: r.left })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  const toggle = () => {
    const r = btnRef.current ? btnRef.current.getBoundingClientRect() : null
    popoverBus.set(!open, r ? { top: r.top, left: r.left } : null)
  }

  if (quota.data === null) {
    // 无缓存（首载或查询失败）：显示占位/错误，仍可点击打开浮层重试
    return (
      <button
        ref={btnRef}
        type="button"
        className={'dshpq-side' + (quota.pending ? ' pending' : '')}
        title={quota.failed ? '额度查询失败，点击重试' : '正在查询订阅额度…'}
        aria-expanded={open}
        onClick={toggle}
      >
        <SideHeader pending={quota.pending} />
        <span className={'dshpq-side-empty' + (quota.failed ? ' failed' : '')}>
          {quota.failed ? '额度查询失败，点击重试' : '正在同步额度…'}
        </span>
      </button>
    )
  }
  const { rows, tip, worst } = buildReadout(quota.data)
  if (rows.length === 0) return null
  if (!wide) {
    return (
      <button
        ref={btnRef}
        type="button"
        className={'dshpq-side-rail' + (quota.pending ? ' pending' : '')}
        title={tip}
        aria-label="查看 Provider 额度"
        aria-expanded={open}
        onClick={toggle}
      >
        <i className={'dshpq-dot lv-' + worst} />
      </button>
    )
  }
  return (
    <button
      ref={btnRef}
      type="button"
      className={'dshpq-side' + (quota.pending ? ' pending' : '')}
      title={tip}
      aria-label="查看 Provider 额度详情"
      aria-expanded={open}
      onClick={toggle}
    >
      <SideHeader pending={quota.pending} />
      <span className="dshpq-side-list">
        {rows.map((r) => (
          <span className="dshpq-side-row" key={r.key}>
            <span className="dshpq-side-provider">
              <i className={'dshpq-dot lv-' + r.lv} />
              <span className="dshpq-side-name">{r.name}</span>
              {r.plan
                ? <span className="dshpq-side-plan" title={'订阅等级：' + r.plan}>{r.plan}</span>
                : null}
            </span>
            <span className="dshpq-side-metrics">
              {r.metrics.map((metric) => (
                <span className="dshpq-side-metric" key={metric.key}>
                  {metric.label ? <span className="dshpq-side-metric-label">{metric.label}</span> : null}
                  <span className={'dshpq-side-metric-value lv-' + (metric.lv || 'high')}>{metric.value}</span>
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </button>
  )
}

// 详情浮层（shell.overlay 图层）：侧边栏列 overflow:hidden，直接绝对定位会被
// 裁剪，因此浮层渲染在 overlay 图层里，position:fixed 定位于读数按钮上方。
export function QuotaPopover(): ReactNode {
  const quota = useQuotaMirror()
  const { open, anchor } = usePopoverState()

  // 点击浮层与读数按钮之外关闭
  useEffect(() => {
    if (!open) return undefined
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node | null
      if (t instanceof Element && t.closest('.dshpq-pop-side, .dshpq-side, .dshpq-side-rail')) return
      popoverBus.set(false, null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!open || quota === null || anchor === null) return null
  return (
    <div className="dshpq-pop dshpq-pop-side" style={{ top: anchor.top - 8, left: anchor.left }}>
      <PanelBody quota={quota} />
    </div>
  )
}
