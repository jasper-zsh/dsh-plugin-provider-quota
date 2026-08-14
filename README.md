# dsh-plugin-provider-quota

[DeepSeek Harness（DSH）](https://github.com/deepseek-ai/DeepSeek-Harness) 的 Web 插件：在侧边栏底部展示模型 Provider 的订阅额度、限流窗口与账户余额（如 DeepSeek），点击读数即可查看详情。读数注册在 `sidebar.footer.action`（root 作用域），新会话页面与所有页面常驻，切换会话不重挂载、不闪烁。

## 功能特性

- **紧凑额度读数**：侧边栏展开时每个 Provider 一行，显示订阅周期和最短限额窗口的剩余比例，例如 `Kimi 66% · 5h 34%`、`Codex 5h 94%`、`Z.AI CN 5h 99%`、`DeepSeek ¥110.00`；侧边栏收起为窄栏时退化为单个指示灯圆点（颜色取所有 Provider 的最差状态）。
- **可视化详情**：点击读数在浮层中展示会员等级、剩余额度、已用进度、重置时间、路由状态、更新时间，以及余额型 Provider 的币种总余额与充值/赠送明细。浮层渲染在 `shell.overlay` 图层，不会被侧边栏裁剪。
- **额度预警**：剩余比例高于 35% 显示绿色，高于 10% 且不超过 35% 显示黄色，10% 及以下显示红色；存在多个 Provider 或窗口时采用最差状态。余额型 Provider 在账户余额不足（`is_available: false`）时读数变红并在详情中提示。
- **回合末刷新**：每轮对话结束后 2 秒静默全量刷新一次额度（读数在 root 作用域拿不到聊天节点，无法精准定位本轮 Provider，故退化为全量刷新）。
- **自动轮询**：每 5 分钟更新一次，Host 端使用 30 秒缓存以减少外部请求；客户端保留最近一次成功结果，任何重挂载都先渲染缓存、后台静默刷新，不会闪烁。
- **安全凭据解析**：通过 DSH `credentials` 服务读取 `apiKeyEnv` 引用，原始凭据不会发送到浏览器，也不会写入响应或日志。

## 支持的 Provider

| Provider | 路由 ID | 额度接口 | 凭据说明 |
| --- | --- | --- | --- |
| Kimi For Coding | `kimi-coding` | `https://api.kimi.com/coding/v1/usages`（另请求 `/coding/v1/me` 取会员等级展示名 `user_level_name`） | 使用该路由 `apiKeyEnv` 引用的凭据，通常为 `KIMI_API_KEY`。 |
| OpenAI Codex | `openai-codex` | `https://chatgpt.com/backend-api/wham/usage` | 使用 `CODEX_OAUTH_ACCESS_TOKEN`；建议由 [`dsh-plugin-llm-codex`](https://github.com/jasper-zsh/dsh-plugin-llm-codex) 完成 OAuth 登录和自动刷新。 |
| Z.AI（国际站） | `zai` | `https://api.z.ai/api/monitor/usage/quota/limit`（另请求 `/api/biz/subscription/list` 取订阅 `productName`，剥掉产品线前缀后展示为档位名，如 "GLM Coding Pro" → "Pro"） | 默认凭据引用 `ZAI_API_KEY`；标准 `Bearer` 鉴权。 |
| Z.AI Coding CN（大陆站） | `zai-coding-cn` | `https://open.bigmodel.cn/api/monitor/usage/quota/limit`（另请求 `/api/biz/subscription/list`，档位名处理同上） | 默认凭据引用 `ZAI_CODING_CN_API_KEY`；大陆站 biz/monitor 网关只认裸 API key（无 `Bearer` 前缀），插件已按站点自动处理。 |
| DeepSeek | `deepseek-official` | `https://api.deepseek.com/user/balance` | 由 DSH 自带的 `dsh-llm-deepseek` 插件注册，凭据缺省引用 `DEEPSEEK_API_KEY`（可在 `llm-deepseek.apiKeyEnv` 覆盖）。余额是货币金额而非百分比订阅额度，详情展示各币种总余额与充值/赠送明细。 |

Z.AI 两站共用同一路径与响应形态：`data.limits[]` 中的 `TOKENS_LIMIT` 条目即订阅 token 窗口（5 小时 session 与 7 天 weekly，按 `unit`+`number` 识别时长，`percentage` 为已用百分比，`nextResetTime` 为 epoch 毫秒重置时间）；月度工具调用额度（`TIME_LIMIT`，次数语义）不计入百分比展示。

插件只展示同时满足以下条件的 Provider：

1. 已在本插件的 Provider 注册表中支持；
2. 已在 DSH 中配置对应路由 —— `providers` 型（Kimi/Codex/Z.AI）在 `llm-pi-ai.providers` 配置；命名空间型（DeepSeek）由 `dsh-llm-deepseek` 注册、路由激活即展示，无需额外配置。

如果路由已配置但凭据缺失、无法解析或额度接口报错，徽标与详情面板会显示该 Provider 的错误状态。

## 快速开始

### 1. 获取并构建

需要已安装 DSH、Node.js 和 pnpm。

```bash
git clone https://github.com/jasper-zsh/dsh-plugin-provider-quota.git
cd dsh-plugin-provider-quota
pnpm install
```

`pnpm install` 会通过 `prepare` 脚本自动生成 `lib/`；也可以随时运行 `pnpm build` 手动构建。

### 2. 安装到 Web profile

在插件目录中运行：

```bash
dsh plugin --profile web add "$PWD"
```

如果 `dsh` 不在 `PATH` 中：

```bash
node <dsh-checkout>/lib/bin.js plugin --profile web add "$PWD"
```

### 3. 挂载插件

编辑 `$DSH_HOME/profiles/web/cordis.patch.yml`（默认路径为 `~/.dsh/profiles/web/cordis.patch.yml`），将以下内容合并到现有顶层数组：

```yaml
- insert:
    - id: provider-quota
      name: dsh-plugin-provider-quota
```

如果文件当前内容为 `[]`，直接用上面的内容替换；如果已有其他 patch，请保留原内容并追加该项。

### 4. 配置 Provider

可以通过 DSH Web 的模型设置添加 Provider 和凭据，也可以编辑 `$DSH_HOME/settings.yaml`。以下示例同时配置 Kimi 和 Codex：

```yaml
llm-pi-ai:
  providers:
    kimi-coding:
      apiKeyEnv: KIMI_API_KEY
    openai-codex:
      apiKeyEnv: CODEX_OAUTH_ACCESS_TOKEN
    zai-coding-cn:
      apiKeyEnv: ZAI_CODING_CN_API_KEY
```

`apiKeyEnv` 是 DSH 的**凭据引用**，不是要写入 `settings.yaml` 的密钥明文。只需保留实际使用的 Provider：

- **Kimi**：确保 `KIMI_API_KEY` 能由 DSH `credentials` 服务或进程环境解析。
- **Codex**：先安装并登录 [`dsh-plugin-llm-codex`](https://github.com/jasper-zsh/dsh-plugin-llm-codex)，由它维护 `CODEX_OAUTH_ACCESS_TOKEN`；本插件只读取消费该令牌，不参与令牌生命周期。
- **Z.AI**：国际站路由 `zai` 默认读取 `ZAI_API_KEY`，大陆站路由 `zai-coding-cn` 默认读取 `ZAI_CODING_CN_API_KEY`（与 pi-ai 的环境变量一致，profile 里可省略 `apiKeyEnv`）；两站均使用 GLM Coding Plan 的 API key，插件只读查询用量，不消耗额度。
- **DeepSeek**：无需在 `llm-pi-ai.providers` 中配置 —— 路由 `deepseek-official` 由 DSH 自带的 `dsh-llm-deepseek` 插件注册，默认读取 `DEEPSEEK_API_KEY` 凭据；本插件调用 `GET /user/balance` 只读展示余额，不消耗余额。如需覆盖凭据引用，可在 `llm-deepseek` 命名空间设置 `apiKeyEnv`。

### 5. 启动并验证

首次安装后重启 `dsh web`。侧边栏底部应出现额度读数（新会话页面同样可见）；也可以直接检查 Host 端点：

```bash
curl http://127.0.0.1:3080/provider-quota/quota.json
```

## 使用方式

- 将鼠标悬停在读数上，可查看各额度窗口的剩余、已用和重置时间。
- 点击读数，可展开 Provider 详情浮层（渲染在 `shell.overlay` 图层，侧边栏收起为窄栏时同样可用）。
- 点击详情底部的“刷新”，可绕过 Host 缓存执行全量刷新。
- 一轮响应完成或被中断后，插件会自动静默刷新一次额度。

## HTTP API

所有响应均设置 `Cache-Control: no-store`。`no-store` 用于阻止浏览器和代理缓存；插件内部仍保留 30 秒 Host 缓存。

| 请求 | 说明 |
| --- | --- |
| `GET /provider-quota/quota.json` | 返回完整额度视图；30 秒内可命中 Host 缓存。 |
| `GET /provider-quota/quota.json?force=1` | 绕过缓存，强制刷新所有已配置且受支持的 Provider。 |
| `GET /provider-quota/quota.json?provider=<id>` | 已有完整缓存时，仅刷新指定 Provider 并合并结果；首次请求无缓存时会先执行全量刷新。 |

如果同时传入 `provider` 和 `force=1`，定向刷新逻辑优先，`force` 不会触发额外的全量刷新。

例如：

```bash
curl 'http://127.0.0.1:3080/provider-quota/quota.json?provider=kimi-coding'
curl 'http://127.0.0.1:3080/provider-quota/quota.json?provider=zai-coding-cn'
curl 'http://127.0.0.1:3080/provider-quota/quota.json?provider=deepseek-official'
curl 'http://127.0.0.1:3080/provider-quota/quota.json?force=1'
```

## 项目结构

```text
src/
├── index.ts              # Host 入口和 HTTP 端点
├── quota.ts              # 凭据解析、额度查询与缓存策略
├── services.ts           # Host 服务类型
├── types.ts              # Host/Client 共享响应类型
├── providers/            # Provider 定义、归一化逻辑与注册表
└── client/
    ├── index.tsx         # Web 插件入口与槽位注册
    ├── api.ts            # 同源额度请求（含客户端缓存与并发去重）
    ├── store.ts          # 读数 ↔ 浮层跨槽位状态桥
    ├── hooks.ts          # 轮询、会话运行态与回合末刷新
    ├── format.ts         # 格式化与状态计算
    ├── components.tsx    # 侧边栏读数与详情浮层
    └── styles.ts         # 插件样式
```

构建会生成两个入口：

- `lib/index.js`：Host ESM；
- `lib/client.js`：DSH Web 使用的 Client bundle。

`lib/` 是构建产物，不提交到 Git。

## 开发

```bash
pnpm install      # 安装依赖并执行 prepare 构建
pnpm build        # 一次性构建
pnpm dev          # 监听源码并持续构建
pnpm typecheck    # TypeScript 严格类型检查
```

## 扩展新的 Provider

当前通用查询引擎固定使用 `GET`，默认携带 `Authorization: Bearer <credential>`；需要其他鉴权方式时可在 `headers(key)` 中覆盖 `authorization` 头（如 Z.AI 大陆站的裸 key）。以下扩展方式适用于兼容该请求模型的 Provider；其他请求方式需要先扩展查询引擎。

1. 在 `src/providers/` 新建 Provider 文件并实现 `ProviderDef`：
   - `id`：DSH 中的 Provider 路由 ID；
   - `name` / `short`：详情标题与徽标短名；
   - `settingsNs`：Provider 配置所在的 settings 命名空间；profile 在 providers 字典（默认）或命名空间自身（`settingsShape: 'self'`，如 DeepSeek）时无需设置；
   - `usagesUrl`：额度（或余额）查询地址；
   - `normalize(payload, extra?)`：将原始响应转换为统一的 `NormalizedQuota`。
2. 如果请求需要从凭据派生额外 Header，实现可选的 `headers(key)`。
3. 如果展示还需要另一个只读端点（如 Kimi 的 `/me` 会员展示名），实现可选的 `extraUrls`（键名会出现在 `normalize` 的 `extra` 参数中；请求失败只让对应键缺席，不中止查询）。
4. 在 `src/providers/index.ts` 的 `SUPPORTED` 数组中注册该定义。

百分比型 Provider 填充 `usage`/`windows`；货币余额型 Provider（如 DeepSeek）把数据放入 `balance`（`{ available, entries: [{ currency, total, granted, toppedUp }] }`），`usage`/`windows` 置空。Client 端由统一数据结构驱动，两类 Provider 都会自动渲染，不需要为新 Provider 修改组件。

## 常见问题

### 侧边栏底部没有额度读数

确认至少一个受支持的 Provider 已在 DSH 中配置（Kimi/Codex/Z.AI 在 `llm-pi-ai.providers`；DeepSeek 由 `dsh-llm-deepseek` 插件注册路由即可）。如果接口返回的 `providers` 数组为空，插件会隐藏读数。

### Provider 显示警告标记

点击徽标查看具体错误。常见原因包括：

- 路由没有配置 `apiKeyEnv`；
- 凭据引用未写入 DSH credentials，也不存在于进程环境；
- 凭据已过期或额度接口返回 HTTP 错误；
- Codex access token 不是包含 `chatgpt_account_id` 的 OAuth JWT；
- Z.AI 使用了非 Coding Plan 的标准 API key（额度接口找不到订阅窗口，会提示“响应中没有可用的订阅额度窗口”）；
- DeepSeek 余额不足（`is_available: false`）时读数变红、详情显示“账户余额不足”，需前往 DeepSeek 开放平台充值。

### 详情显示“路由未激活”

额度查询依据 settings 中的 Provider 配置执行；“路由未激活”表示该路由当前没有注册到 DSH `llm` 服务，请同时检查模型路由配置及对应模型插件。

## 安全说明

- Provider 凭据只在 Host 进程内存中解析和使用。
- 浏览器只接收归一化后的额度、计划、窗口和错误信息。
- 本插件不会保存、刷新或返回原始令牌。
- 请仅在可信环境中运行 DSH Web，不要把额度端点直接暴露给不受信任的网络。
