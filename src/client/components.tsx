// Presentational components: the dock badge and its detail popover.
// 全部渲染由 QuotaView 数据驱动，新增 provider 不需要改动这里。

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ProviderEntry, QuotaDetail, QuotaWindow } from '../types'
import {
  fmtPct,
  fmtReset,
  fmtTime,
  lastTurnProvider,
  levelOf,
  primaryWindow,
  shortWindowLabel,
  usedPct,
  windowLabel,
} from './format'
import type { Level } from './format'
import { useQuota, useTurnEndRefresh } from './hooks'
import type { QuotaState } from './hooks'
import type { DockSlotProps, TimerService } from './services'

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

function ProviderCard({ p }: { p: ProviderEntry }) {
  return (
    <div className="dshpq-card">
      <div className="dshpq-card-head">
        <span className="dshpq-name">{p.name}</span>
        {p.quota && p.quota.plan ? <span className="dshpq-plan">{p.quota.plan}</span> : null}
        {!p.routeActive ? <span className="dshpq-inactive">路由未激活</span> : null}
        {p.fetchedAt ? <span className="dshpq-card-time">{fmtTime(p.fetchedAt)}</span> : null}
      </div>
      {p.state !== 'ok' || !p.quota
        ? <div className="dshpq-error">{p.error || '查询失败'}</div>
        : (
          <>
            {p.quota.usage ? <UsageBlock label="订阅周期额度" u={p.quota.usage} /> : null}
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

export function Badge(props: DockSlotProps & { timer: TimerService | undefined }) {
  const quota = useQuota(300000, props.timer)
  const [open, setOpen] = useState(false)
  const running = !!(props && props.session && props.session.running)
  const turnProvider = lastTurnProvider(props && props.session)
  useTurnEndRefresh(quota.load, running, turnProvider, props.timer)

  // 浮层打开时点击外部关闭
  useEffect(() => {
    if (!open) return undefined
    const onDown = (ev: MouseEvent) => {
      let node = ev.target as Node | null
      while (node) {
        if (node instanceof Element && node.classList.contains('dshpq-wrap')) return
        node = node.parentNode
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  let badge: ReactNode = null
  if (quota.data === null) {
    badge = <span className="dshpq-badge pending" title="正在查询订阅额度…">额度 …</span>
  } else {
    const providers = Array.isArray(quota.data.providers) ? quota.data.providers : []
    if (providers.length === 0) return null
    const texts: string[] = []
    const titles: string[] = []
    let worst: Level = 'high'
    const degrade = (lv: Level) => {
      if (lv === 'low') worst = 'low'
      else if (lv === 'mid' && worst === 'high') worst = 'mid'
    }
    for (const p of providers) {
      const short = typeof p.short === 'string' ? p.short : p.name
      const wins = p.quota && Array.isArray(p.quota.windows) ? p.quota.windows : []
      if (p.state === 'ok' && p.quota && (p.quota.usage || wins.length > 0)) {
        // 头条 = 周期剩余（有周期概念时，如 Kimi），否则 = 最短窗口剩余（如 Codex）
        let text = short
        if (p.quota.usage) {
          const u = p.quota.usage
          text += ' ' + fmtPct(u.remaining)
          titles.push(p.name + ' 周期额度：剩余 ' + fmtPct(u.remaining) + ' · 已用 ' + fmtPct(u.used) + (u.resetTime ? '（' + fmtReset(u.resetTime) + '）' : ''))
          degrade(levelOf(u))
        }
        const win = primaryWindow(wins)
        if (win !== null) {
          const d = win.detail
          text += (p.quota.usage ? ' · ' : ' ') + shortWindowLabel(win.durationMinutes) + ' ' + fmtPct(d.remaining)
        }
        for (const w of wins) {
          if (!w || !w.detail) continue
          titles.push(p.name + ' ' + windowLabel(w.durationMinutes) + '：剩余 ' + fmtPct(w.detail.remaining) + ' · 已用 ' + fmtPct(w.detail.used) + (w.detail.resetTime ? '（' + fmtReset(w.detail.resetTime) + '）' : ''))
          degrade(levelOf(w.detail))
        }
        texts.push(text)
      } else {
        texts.push(short + ' ⚠')
        titles.push(p.name + '：' + (p.error || '查询失败'))
        if (worst === 'high') worst = 'mid'
      }
    }
    const tip = titles.join('\n') + (quota.data.fetchedAt ? '\n更新于 ' + fmtTime(quota.data.fetchedAt) : '') + '\n点击查看详情'
    badge = (
      <button
        className={'dshpq-badge lv-' + worst + (quota.pending ? ' pending' : '')}
        title={tip}
        onClick={() => setOpen(!open)}
      >
        <span className="dshpq-dot" />
        {texts.join(' · ')}
      </button>
    )
  }
  return (
    <div className="dshpq-wrap">
      {badge}
      {open ? <div className="dshpq-pop"><PanelBody quota={quota} /></div> : null}
    </div>
  )
}
