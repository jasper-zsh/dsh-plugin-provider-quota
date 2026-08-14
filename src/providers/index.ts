// Provider registry — the single extension point.
//
// 扩展新 provider：
//   1. 新建 src/providers/<id>.ts，导出实现 ProviderDef 的常量
//      （id = llm-pi-ai 的 provider 路由名，normalize 产出 NormalizedQuota）；
//   2. 在下方 SUPPORTED 追加一项。
// client 半包无需改动（条目渲染与空态提示均由数据驱动）。

import { codex } from './codex'
import { deepseek } from './deepseek'
import { kimi } from './kimi'
import type { ProviderDef } from './types'

export const SUPPORTED: ProviderDef[] = [kimi, codex, deepseek]

export type { ProviderDef } from './types'
