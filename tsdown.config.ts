// tsdown build, modeled on the harness repo's packages/client/tsdown.client.ts
// preset: a node-half ESM lib build plus the browser client bundle.
//
// The client bundle emits the harness's lazy-CJS handoff format: banner/footer
// wrap the output so executing lib/client.js only calls
// window.__ModuleLoader__.load({ id, factory }); react and react/jsx-runtime
// stay external and are answered by the shell's frozen module table.

import { defineConfig } from 'tsdown'

const id = 'dsh-plugin-provider-quota'

export default defineConfig([
  {
    name: id,
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    // clean 只用于 Host 已停止的 release 构建（DSHPQ_CLEAN=1 pnpm build）。
    // 开发期必须原位改写：运行中的 Host 用 chokidar 文件事件做 HMR，只认
    // change；clean 的 unlink → add 序列会让 HMR 漏掉这次重建。
    clean: process.env.DSHPQ_CLEAN === '1',
  },
  {
    name: `${id}/client`,
    entry: { client: 'src/client/index.tsx' },
    // Browser bundle lands next to the node half (single lib/ artifact dir;
    // entryFileNames pins it to exactly lib/client.js). clean must stay off —
    // a default clean would wipe the node-half output emitted above.
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: { neverBundle: ['react', 'react/jsx-runtime'] },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
