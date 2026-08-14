// Styles for the sidebar readout and detail popover. Injected as one <style> tag
// by the plugin's apply() (removed again on unload via ctx.effect's disposer).

export const CSS = `
/* —— 指示灯圆点（读数行与收起态圆点共用）—— */
.dshpq-dot{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 0 2px color-mix(in srgb,currentColor 14%,transparent);flex:none}
.dshpq-dot.lv-high{color:var(--dsw-alias-state-success-primary,#3fb950)}
.dshpq-dot.lv-mid{color:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-dot.lv-low{color:var(--dsw-alias-state-error-primary,#f85149)}
/* —— sidebar.footer.action 是 list slot：动态 Cordis Plugin 出现时会成为第二个
   100% 宽 occupant。shell 默认横排会把后一个 occupant 推出侧边栏，因此只在本插件
   占用该槽位时，把稳定的 data-slot 容器切成纵向堆叠；rail 同样改为居中纵排。—— */
:where(div):has(> [data-slot="sidebar.footer.action"] > .dshpq-side){flex-direction:column;align-items:stretch}
:where(div):has(> [data-slot="sidebar.footer.action"] > .dshpq-side-rail){flex-direction:column;align-items:center;gap:2px}
/* —— 侧边栏底部读数：占满槽位的表格式卡片 —— */
.dshpq-side{display:flex;flex:none;flex-direction:column;align-items:stretch;width:100%;min-width:0;box-sizing:border-box;overflow:hidden;padding:6px 8px 5px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.24));border-radius:10px;background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.06));color:inherit;cursor:pointer;text-align:left;font:inherit;transition:background-color .15s,border-color .15s,box-shadow .15s}
.dshpq-side:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2,rgba(128,128,128,.42))}
.dshpq-side:focus-visible,.dshpq-side-rail:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#7c5cff);outline-offset:2px}
.dshpq-side-head{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;box-sizing:border-box;padding:0 1px 3px}
.dshpq-side-title{overflow:hidden;color:var(--dsw-alias-label-secondary,#999);font-size:9px;font-weight:650;line-height:1.4;letter-spacing:.09em;text-transform:uppercase;text-overflow:ellipsis;white-space:nowrap}
.dshpq-side-hint{flex:none;color:var(--dsw-alias-label-secondary,#999);font-size:9px;line-height:1.4;opacity:.72;white-space:nowrap}
.dshpq-side-hint>span{display:inline-block;margin-left:1px;font-size:10px;transition:transform .15s}
.dshpq-side[aria-expanded="true"] .dshpq-side-hint{color:var(--dsw-alias-label-primary,#ddd);opacity:1}
.dshpq-side[aria-expanded="true"] .dshpq-side-hint>span{transform:translateY(-1px)}
.dshpq-side.pending .dshpq-side-hint{color:var(--dsw-alias-brand-primary,#7c5cff);opacity:1}
.dshpq-side-list{display:flex;flex-direction:column;width:100%;min-width:0}
.dshpq-side-row{display:grid;grid-template-columns:minmax(54px,1fr) auto;align-items:center;column-gap:8px;width:100%;min-width:0;box-sizing:border-box;padding:4px 1px;color:var(--dsw-alias-label-primary,#ddd);font-variant-numeric:tabular-nums}
.dshpq-side-row+.dshpq-side-row{border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.18))}
.dshpq-side-provider{display:flex;align-items:center;gap:6px;min-width:0}
.dshpq-side-name{min-width:0;overflow:hidden;font-size:11px;font-weight:520;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
.dshpq-side-plan{flex:none;max-width:52px;box-sizing:border-box;overflow:hidden;padding:1px 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.12));background:color-mix(in srgb,var(--dsw-alias-brand-primary,#7c5cff) 12%,transparent);color:var(--dsw-alias-brand-primary,#7c5cff);font-size:8px;font-weight:700;line-height:1.35;letter-spacing:.03em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
.dshpq-side-metrics{display:flex;align-items:baseline;justify-content:flex-end;gap:8px;min-width:0}
.dshpq-side-metric{display:inline-flex;align-items:baseline;gap:3px;white-space:nowrap}
.dshpq-side-metric-label{color:var(--dsw-alias-label-secondary,#999);font-size:9px;line-height:1.35}
.dshpq-side-metric-value{color:var(--dsw-alias-label-primary,#ddd);font-size:11px;font-weight:650;line-height:1.35;letter-spacing:-.01em}
.dshpq-side-metric-value.lv-mid{color:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-side-metric-value.lv-low{color:var(--dsw-alias-state-error-primary,#f85149)}
.dshpq-side-empty{width:100%;box-sizing:border-box;padding:7px 1px 4px;color:var(--dsw-alias-label-secondary,#999);font-size:11px;line-height:1.4}
.dshpq-side-empty.failed{color:var(--dsw-alias-state-error-primary,#f85149)}
/* —— 收起态（rail）：单个指示灯圆点 —— */
.dshpq-side-rail{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:none;background:transparent;color:inherit;cursor:pointer;border-radius:50%;flex:none}
.dshpq-side-rail:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshpq-side-rail .dshpq-dot{width:10px;height:10px}
.dshpq-side-rail.pending{opacity:.6}
/* —— 详情浮层（shell.overlay 图层内，position:fixed 定位）—— */
.dshpq-pop{position:absolute;bottom:calc(100% + 8px);left:0;min-width:300px;max-width:400px;background:var(--dsw-alias-bg-overlay,#1e1e1e);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:10px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.3);z-index:60}
.dshpq-pop-side{position:fixed;bottom:auto;transform:translateY(-100%);pointer-events:auto;max-width:min(400px,calc(100vw - 24px))}
.dshpq-panel{display:flex;flex-direction:column;gap:10px;font-size:12px;color:var(--dsw-alias-label-primary,#ddd)}
.dshpq-card{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:10px;padding:12px;background:var(--dsw-alias-bg-layer-1,transparent);display:flex;flex-direction:column;gap:10px}
.dshpq-card-head{display:flex;align-items:center;gap:8px}
.dshpq-name{font-weight:600;font-size:13px}
/* brand-primary 与 bg-base 在两个主题下互为反色：light 主题深底白字、dark 主题浅底深字 */
.dshpq-plan{font-size:10px;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-brand-primary,#7c5cff);color:var(--dsw-alias-bg-base,#fff);text-transform:capitalize}
.dshpq-inactive{font-size:10px;color:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-block{display:flex;flex-direction:column;gap:5px}
.dshpq-block-label{font-size:11px;color:var(--dsw-alias-label-secondary,#999);display:flex;justify-content:space-between;gap:8px}
.dshpq-nums{display:flex;align-items:baseline;gap:6px}
.dshpq-remaining{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
.dshpq-remaining.lv-high{color:var(--dsw-alias-state-success-primary,#3fb950)}
.dshpq-remaining.lv-mid{color:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-remaining.lv-low{color:var(--dsw-alias-state-error-primary,#f85149)}
.dshpq-limit{font-size:11px;color:var(--dsw-alias-label-secondary,#999)}
.dshpq-bar{height:5px;border-radius:3px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.2));overflow:hidden}
.dshpq-bar>i{display:block;height:100%;border-radius:3px;transition:width .3s}
.dshpq-bar>i.lv-high{background:var(--dsw-alias-state-success-primary,#3fb950)}
.dshpq-bar>i.lv-mid{background:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-bar>i.lv-low{background:var(--dsw-alias-state-error-primary,#f85149)}
.dshpq-windows{display:flex;flex-direction:column;gap:6px;border-top:1px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.3));padding-top:8px}
.dshpq-window-block{display:flex;flex-direction:column;gap:5px}
.dshpq-window{display:flex;align-items:center;gap:8px;font-size:11px}
.dshpq-window .dshpq-bar{flex:1}
.dshpq-window-nums{min-width:72px;text-align:right;font-variant-numeric:tabular-nums;flex:none}
.dshpq-balance{display:flex;flex-direction:column;gap:6px}
.dshpq-balance-warn{font-size:11px;color:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-balance-row{display:flex;align-items:baseline;gap:8px;font-variant-numeric:tabular-nums}
.dshpq-balance-currency{font-size:11px;color:var(--dsw-alias-label-secondary,#999);min-width:36px}
.dshpq-balance-total{font-size:22px;font-weight:700;color:var(--dsw-alias-label-primary,#ddd)}
.dshpq-balance.unavailable .dshpq-balance-total{color:var(--dsw-alias-state-error-primary,#f85149)}
.dshpq-balance-sub{font-size:11px;color:var(--dsw-alias-label-secondary,#999);margin-left:auto;white-space:nowrap}
.dshpq-error{font-size:11px;color:var(--dsw-alias-state-error-primary,#f85149);white-space:pre-wrap;word-break:break-all}
.dshpq-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:var(--dsw-alias-label-secondary,#999)}
.dshpq-refresh{font:inherit;font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));background:transparent;color:var(--dsw-alias-label-primary,#ddd);cursor:pointer}
.dshpq-refresh:hover{border-color:var(--dsw-alias-border-l2,rgba(128,128,128,.6))}
.dshpq-refresh:disabled{opacity:.5;cursor:default}
.dshpq-empty{font-size:11px;color:var(--dsw-alias-label-secondary,#999);line-height:1.6}
`
