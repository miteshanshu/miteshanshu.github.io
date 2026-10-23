// Smoke check for the built site. Usage: node scripts/smoke.mjs [dir]   (default: dist)
// Exits non-zero and prints every failure it finds.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] || 'dist'
const fail = []
const ok = (cond, msg) => { if (!cond) fail.push(msg) }

ok(existsSync(join(dir, 'index.html')), 'index.html missing')
const html = readFileSync(join(dir, 'index.html'), 'utf8')

// prerender: root must carry real content, not an empty shell
const rootStart = html.indexOf('<div id="root">')
const rootEnd = html.indexOf('</body>')
ok(rootStart !== -1 && rootEnd - rootStart > 3000, '#root is empty or too small - prerender did not run')
ok(html.includes('FULL STACK DEVELOPER'), 'hero headline missing from prerendered HTML')

// every local src/href target must exist on disk
const refs = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => m[1].split('#')[0])
for (const r of refs) ok(existsSync(join(dir, r)), 'referenced file missing: ' + r)

// required files
for (const f of ['Mitesh-Anshu-Resume.pdf', 'robots.txt', 'sitemap.xml', 'og.png'])
  ok(existsSync(join(dir, f)), 'required file missing: ' + f)

// SEO basics
for (const tag of ['<title>', 'name="description"', 'rel="canonical"', 'property="og:title"', 'application/ld+json'])
  ok(html.includes(tag), 'missing SEO markup: ' + tag)

// no counter-prefixed upload accidents (1-app.js etc.)
const junk = readdirSync(dir).filter((f) => /^\d+-/.test(f))
ok(junk.length === 0, 'counter-prefixed files present: ' + junk.join(', '))

// bundle sanity
const app = readdirSync(dir).find((f) => /^app-.*\.js$/.test(f))
ok(!!app, 'app bundle missing')
if (app) {
  const js = readFileSync(join(dir, app), 'utf8')
  ok(js.includes('MATBHED'), 'app bundle does not contain project content')
}

if (fail.length) {
  console.error('SMOKE FAIL (' + fail.length + ')')
  fail.forEach((f) => console.error(' - ' + f))
  process.exit(1)
}
console.log('smoke ok:', refs.length, 'refs checked in', dir)
