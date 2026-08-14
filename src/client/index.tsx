// dsh-plugin-provider-quota — Web client half entry.
//
// Built by tsdown into lib/client.js in the harness's lazy-CJS bundle format:
// the banner/footer wrap the factory so executing the script only REGISTERS it;
// react / react/jsx-runtime stay external and resolve through the shell's module
// table. slots/timer/sessions are cordis client services obtained from the plugin
// context.
//
// UI：侧边栏底部的低调额度读数（sidebar.footer.action，root 作用域，新会话页与
// 所有页面常驻，切换会话不重挂载），点击在 overlay 图层弹出详情浮层
// （shell.overlay：侧边栏列 overflow:hidden，浮层直接定位会被裁剪）。
// 数据源：同源 GET /provider-quota/quota.json（Host 半包注册）。
// 组件在 components.tsx，数据 hooks 在 hooks.ts —— 扩展 provider 不涉及本半包。

import type { Context } from '@deepseek-ai/cordis'
import { QuotaFooter, QuotaPopover } from './components'
import type { SessionsService, TimerService } from './services'
import { CSS } from './styles'

export const inject = ['slots']

export function apply(ctx: Context) {
  const slots = ctx.slots
  const timer = ctx.get('timer') as TimerService | undefined
  const sessions = ctx.get('sessions') as SessionsService | undefined

  ctx.effect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-dsh-plugin', 'dsh-plugin-provider-quota')
    el.textContent = CSS
    document.head.appendChild(el)
    return () => el.remove()
  })

  slots.inject('sidebar.footer.action', () => slots.register(
    { name: 'sidebar.footer.action', id: 'provider-quota', order: 10, label: '订阅额度' },
    (props) => <QuotaFooter wide={Boolean((props as { wide?: boolean }).wide)} timer={timer} sessions={sessions} />,
  ))

  slots.inject('shell.overlay', () => slots.register(
    { name: 'shell.overlay', id: 'provider-quota-popover', order: 100, label: '订阅额度详情' },
    () => <QuotaPopover />,
  ))
}
