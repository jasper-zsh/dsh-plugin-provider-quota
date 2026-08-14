// React hooks: quota polling state and the turn-end refresh.
// timer 由入口从 ctx 解析后显式传入（cordis timer 服务可缺席，退化为立即/单次执行）。
//
// 会话切换会重挂载会话级槽位里的组件（按 sessionId 重建）。本插件的入口改在
// root 作用域槽位（sidebar.footer.action），组件永不因会话切换重挂载；useQuota
// 仍用模块级缓存（api.ts 的 quotaCache）初始化，任何重挂载（HMR、插件重载）都能
// 瞬间渲染上次额度。有缓存可展示时的刷新（挂载、轮询、回合末）走静默路径，不置
// pending，旧数据原地更新，避免闪烁。pending 只在「无缓存的首载」和「用户手动
// 刷新」时出现。

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { QuotaView } from '../types'
import { loadQuota, quotaCache } from './api'
import type { SessionsService, TimerService } from './services'

export interface QuotaState {
  data: QuotaView | null
  pending: boolean
  failed: boolean
  /** 可见加载：置 pending（首载、重试、手动刷新按钮）。 */
  load(target?: string | null, force?: boolean): void
  /** 静默刷新：不置 pending，有缓存时原地更新。 */
  refresh(target?: string | null, force?: boolean): void
}

export function useQuota(pollMs: number, timer: TimerService | undefined): QuotaState {
  const [data, setData] = useState<QuotaView | null>(() => quotaCache())
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback((target?: string | null, force?: boolean) => {
    setPending(true)
    loadQuota(target, force).then(
      (d) => { setData(d); setPending(false); setFailed(false) },
      () => { setPending(false); setFailed(true) },
    )
  }, [])

  const refresh = useCallback((target?: string | null, force?: boolean) => {
    loadQuota(target, force).then(
      (d) => { setData(d); setFailed(false) },
      () => { setFailed(true) },
    )
  }, [])

  useEffect(() => {
    // 无缓存：首载，显示 pending；有缓存：先用缓存渲染，后台静默刷新
    if (quotaCache() === null) load()
    else refresh()
    if (timer === undefined) return undefined
    return timer.interval(() => refresh(), pollMs)
  }, [])
  return { data, pending, failed, load, refresh }
}

const noopSubscribe = () => () => {}

// 当前会话（sessions store 的 current）是否正在运行。root 作用域入口拿不到
// 输入框的 owner share，改用全局 sessions store 订阅。
export function useSessionRunning(sessions: SessionsService | undefined): boolean {
  return useSyncExternalStore(
    sessions === undefined ? noopSubscribe : (fn) => sessions.list.subscribe(fn),
    sessions === undefined
      ? () => false
      : () => {
        const s = sessions.list.getSnapshot()
        return !!(s.current !== undefined && s.byId?.[s.current]?.running)
      },
  )
}

// 会话 running true→false（一轮响应完成或被中断）后，延迟 2 秒静默全量强制刷新。
// 侧边栏入口拿不到聊天节点，无法像输入框徽标那样精准定位本轮实际使用的
// provider，因此退化为全量刷新（刷新本身静默，数字原地更新，无闪烁）。
export function useTurnEndRefresh(
  refresh: QuotaState['refresh'],
  running: boolean,
  timer: TimerService | undefined,
) {
  const prevRef = useRef(running)
  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = running
    if (!prev || running) return undefined
    const fire = () => refresh(null, true)
    if (timer !== undefined) return timer.timeout(fire, 2000)
    fire()
    return undefined
  }, [running])
}
