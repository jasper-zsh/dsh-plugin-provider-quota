// Client-half service typings: the minimal structural shape of the cordis
// client services and slot props this plugin consumes, plus the Context
// augmentation that makes `ctx.slots` typecheck.

import type { ReactNode } from 'react'

export interface TimerService {
  interval(callback: () => void, delay: number): () => void
  timeout(callback: () => void, delay: number): () => void
}

/** zustand 风格快照 store 的最小形状（sessions.list 即此类）。 */
export interface SnapshotStore<T> {
  subscribe(fn: () => void): () => void
  getSnapshot(): T
}

/** sessions.list 快照中本插件读到的最小子集。 */
export interface SessionsListSnapshot {
  current?: string
  byId?: Record<string, { running?: boolean; blank?: boolean }>
}

export interface SessionsService {
  list: SnapshotStore<SessionsListSnapshot>
}

/** sidebar.footer.action 槽位的 owner props。 */
export interface SidebarFooterProps {
  /** 侧边栏展开（含折叠动画进行中）为 true；完全收起为 false。 */
  wide: boolean
}

export interface SlotMeta {
  name: string
  id: string
  order?: number
  label?: string
}

export interface SlotsService {
  inject(name: string, contribute: () => void | (() => void)): void
  register(meta: SlotMeta, render: (props: unknown) => ReactNode): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    slots: SlotsService
  }
}
