// React hooks: quota polling state and the turn-end targeted refresh.
// timer 由入口从 ctx 解析后显式传入（cordis timer 服务可缺席，退化为立即/单次执行）。

import { useEffect, useRef, useState } from 'react'
import type { QuotaView } from '../types'
import { fetchQuota } from './api'
import type { TimerService } from './services'

export interface QuotaState {
  data: QuotaView | null
  pending: boolean
  failed: boolean
  load(target?: string | null, force?: boolean): void
}

export function useQuota(pollMs: number, timer: TimerService | undefined): QuotaState {
  const [data, setData] = useState<QuotaView | null>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const load = (target?: string | null, force?: boolean) => {
    setPending(true)
    fetchQuota(target, force).then(
      (d) => { setData(d); setPending(false); setFailed(false) },
      () => { setPending(false); setFailed(true) },
    )
  }
  useEffect(() => {
    load()
    if (timer === undefined) return undefined
    return timer.interval(() => load(), pollMs)
  }, [])
  return { data, pending, failed, load }
}

// 会话 running true→false（一轮响应完成或被中断）后，延迟 2 秒精准刷新本轮
// 实际使用的 provider；识别不到 provider 时回退为全量强制刷新。
export function useTurnEndRefresh(
  load: QuotaState['load'],
  running: boolean,
  provider: string | null,
  timer: TimerService | undefined,
) {
  const prevRef = useRef(running)
  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = running
    if (!prev || running) return undefined
    const fire = () => load(provider, true)
    if (timer !== undefined) return timer.timeout(fire, 2000)
    fire()
    return undefined
  }, [running])
}
