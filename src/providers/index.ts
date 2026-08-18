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
import { openrouter } from './openrouter'
import type { ProviderDef } from './types'
import { zai, zaiCn } from './zai'

// 百分比订阅型（kimi/codex/zai）在前，货币余额型（deepseek/openrouter）在后
export const SUPPORTED: ProviderDef[] = [kimi, codex, zai, zaiCn, deepseek, openrouter]

export type { ProviderDef } from './types'
