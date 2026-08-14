// 跨槽位共享的小型外部 store。
//
// 侧边栏底部读数（sidebar.footer.action）持有 useQuota 的唯一实例，并把状态
// 镜像到 quotaBus；详情浮层（shell.overlay）通过 useQuotaMirror 读取同一份
// 状态，保证浮层里的“刷新”与读数实时一致。popover 的开关与锚点坐标由读数
// 写入、浮层订阅。两个入口都是 root 作用域，模块级状态在会话切换间保持。

import { useSyncExternalStore } from 'react'
import type { QuotaState } from './hooks'

// —— quota 状态镜像 ——
let quota: QuotaState | null = null
const quotaSubs = new Set<() => void>()

export const quotaBus = {
  set(q: QuotaState) {
    quota = q
    for (const fn of [...quotaSubs]) fn()
  },
  get: () => quota,
  subscribe(fn: () => void) {
    quotaSubs.add(fn)
    return () => {
      quotaSubs.delete(fn)
    }
  },
}

export function useQuotaMirror(): QuotaState | null {
  return useSyncExternalStore(quotaBus.subscribe, quotaBus.get)
}

// —— 浮层开关与锚点 ——
export interface PopoverAnchor {
  /** 触发按钮左上角（viewport 坐标，配合 position:fixed 使用） */
  top: number
  left: number
}

export interface PopoverUi {
  open: boolean
  anchor: PopoverAnchor | null
}

let ui: PopoverUi = { open: false, anchor: null }
const uiSubs = new Set<() => void>()

export const popoverBus = {
  set(open: boolean, anchor: PopoverAnchor | null) {
    ui = { open, anchor }
    for (const fn of [...uiSubs]) fn()
  },
  get: () => ui,
  subscribe(fn: () => void) {
    uiSubs.add(fn)
    return () => {
      uiSubs.delete(fn)
    }
  },
}

export function usePopoverState(): PopoverUi {
  return useSyncExternalStore(popoverBus.subscribe, popoverBus.get)
}
