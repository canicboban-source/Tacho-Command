import { readFileSync, writeFileSync } from 'node:fs';
// Fresh config: this preview must never inherit production bindings or routes.
const built = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
if (built.main !== 'index.js') throw new Error('Unexpected worker entry point');
const preview = {
  name: 'tachocommand-first-read-preview', main: 'index.js',
  compatibility_date: built.compatibility_date, compatibility_flags: ['nodejs_compat'],
  no_bundle: true, rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
  assets: { directory: '../client', binding: 'ASSETS' },
  workers_dev: true, preview_urls: false, vars: {}, observability: { enabled: false },
};
writeFileSync('dist/server/ux-preview.json', JSON.stringify(preview, null, 2));

// Browser QA only: each iframe gives the actual app a narrow layout viewport.
// Emitted after the production build, solely in the isolated preview artifact.
writeFileSync('dist/client/mobile-review.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TachoCommand · mobile layout review</title>
<style>body{margin:0;background:#202723;color:#e9f2ec;font:14px system-ui;padding:22px}h1{font-size:18px;margin:0 0 6px}p{color:#b5c7bc;margin:0 0 20px}.screens{display:flex;gap:22px;align-items:start}.phone{flex:none}h2{font-size:13px;font-weight:500}iframe{display:block;border:1px solid #526b5b;border-radius:14px;background:#0b1310;height:820px}</style></head>
<body><h1>Android layout review</h1><p>Actual pages in narrow Chrome frames. This checks layout, not physical device or Bluetooth behavior.</p><div class="screens">
<section class="phone"><h2>English · 360 px</h2><iframe title="English at 360 pixels" src="/en" width="360"></iframe></section>
<section class="phone"><h2>Srpski · 390 px</h2><iframe title="Serbian at 390 pixels" src="/sr" width="390"></iframe></section>
<section class="phone"><h2>Deutsch · 412 px</h2><iframe title="German at 412 pixels" src="/de" width="412"></iframe></section>
</div></body></html>`);
