// Client-half service typings: the minimal structural shape of the cordis
// client services and slot props this plugin consumes, plus the Context
// augmentation that makes `ctx.slots` typecheck.

import type { ReactNode } from 'react'

export interface TimerService {
  interval(callback: () => void, delay: number): () => void
  timeout(callback: () => void, delay: number): () => void
}

/** 会话快照中本插件读到的最小子集（InputZone owner share 的 session）。 */
export interface SessionNodeSnapshot {
  kind?: string
  provenance?: { provider?: unknown } | null
  requestConfig?: { provider?: unknown } | null
}

export interface SessionSnapshot {
  running?: boolean
  nodes?: SessionNodeSnapshot[]
}

export interface DockSlotProps {
  session?: SessionSnapshot
}

export interface SlotMeta {
  name: string
  id: string
  order?: number
  label?: string
}

export interface SlotsService {
  inject(name: string, contribute: () => void | (() => void)): void
  register(meta: SlotMeta, render: (props: DockSlotProps) => ReactNode): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: SlotsService
  }
}
