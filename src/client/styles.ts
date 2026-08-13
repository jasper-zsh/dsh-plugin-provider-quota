// Styles for the dock badge and detail popover. Injected as one <style> tag by
// the plugin's apply() (removed again on unload via ctx.effect's disposer).

export const CSS = `
.dshpq-wrap{position:relative;display:inline-flex}
.dshpq-badge{font:inherit;font-size:11px;line-height:1.4;padding:1px 2px;border:none;background:transparent;color:var(--dsw-alias-label-secondary,#888);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;font-variant-numeric:tabular-nums}
.dshpq-badge:hover{color:var(--dsw-alias-label-primary,#ddd)}
.dshpq-badge .dshpq-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.dshpq-badge.lv-high .dshpq-dot{color:var(--dsw-alias-state-success-primary,#3fb950)}
.dshpq-badge.lv-mid .dshpq-dot{color:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-badge.lv-low .dshpq-dot{color:var(--dsw-alias-state-error-primary,#f85149)}
.dshpq-badge.lv-mid{color:var(--dsw-alias-state-warn-primary,#d29922)}
.dshpq-badge.lv-low{color:var(--dsw-alias-state-error-primary,#f85149)}
.dshpq-badge.pending{opacity:.55}
.dshpq-pop{position:absolute;bottom:calc(100% + 8px);left:0;min-width:300px;max-width:400px;background:var(--dsw-alias-bg-overlay,#1e1e1e);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:10px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.3);z-index:60}
.dshpq-panel{display:flex;flex-direction:column;gap:10px;font-size:12px;color:var(--dsw-alias-label-primary,#ddd)}
.dshpq-card{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:10px;padding:12px;background:var(--dsw-alias-bg-layer-1,transparent);display:flex;flex-direction:column;gap:10px}
.dshpq-card-head{display:flex;align-items:center;gap:8px}
.dshpq-card-time{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-secondary,#999);font-variant-numeric:tabular-nums}
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
.dshpq-error{font-size:11px;color:var(--dsw-alias-state-error-primary,#f85149);white-space:pre-wrap;word-break:break-all}
.dshpq-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:var(--dsw-alias-label-secondary,#999)}
.dshpq-refresh{font:inherit;font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));background:transparent;color:var(--dsw-alias-label-primary,#ddd);cursor:pointer}
.dshpq-refresh:hover{border-color:var(--dsw-alias-border-l2,rgba(128,128,128,.6))}
.dshpq-refresh:disabled{opacity:.5;cursor:default}
.dshpq-empty{font-size:11px;color:var(--dsw-alias-label-secondary,#999);line-height:1.6}
`
