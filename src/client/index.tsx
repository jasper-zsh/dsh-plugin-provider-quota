// dsh-plugin-provider-quota — Web client half entry.
//
// Built by tsdown into lib/client.js in the harness's lazy-CJS bundle format:
// the banner/footer wrap the factory so executing the script only REGISTERS it;
// react / react/jsx-runtime stay external and resolve through the shell's module
// table. slots/timer are cordis client services obtained from the plugin context.
//
// UI：输入框底部横条（conversation.composer.dock）的低调读数徽标，点击展开详情浮层。
// 数据源：同源 GET /provider-quota/quota.json（Host 半包注册）。
// 组件在 components.tsx，数据 hooks 在 hooks.ts —— 扩展 provider 不涉及本半包。

import type { Context } from '@deepseek-ai/cordis'
import { Badge } from './components'
import type { TimerService } from './services'
import { CSS } from './styles'

export const inject = ['slots']

export function apply(ctx: Context) {
  const slots = ctx.slots
  const timer = ctx.get('timer') as TimerService | undefined

  ctx.effect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-dsh-plugin', 'dsh-plugin-provider-quota')
    el.textContent = CSS
    document.head.appendChild(el)
    return () => el.remove()
  })

  slots.inject('conversation.composer.dock', () => slots.register(
    { name: 'conversation.composer.dock', id: 'provider-quota', order: 10, label: '订阅额度' },
    (props) => <Badge {...props} timer={timer} />,
  ))
}
