import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  slugOf, dedupeKey, cleanCatalog, parseArgs, probeEntry,
  materializeLocalDir, installClosure, rebuildAllowlisted,
} from '../scripts/mirror-market.js'

test('slugOf: 归一化各种 install 源', () => {
  assert.equal(slugOf('github:owner/dsh-pet'), 'dsh-pet')
  assert.equal(slugOf('github:owner/dsh-pet#path:/packages/x'), 'dsh-pet')
  assert.equal(slugOf('@scope/dsh-tool@1.2.3'), 'scope-dsh-tool')
  assert.equal(slugOf('dsh-emoji'), 'dsh-emoji')
  assert.equal(slugOf('https://github.com/x/y/releases/download/v1/a.tgz'), 'a')
})

test('dedupeKey: npm 名优先，否则 owner/repo（同名不同作者不误杀）', () => {
  assert.equal(dedupeKey({ npm: 'dsh-pet', url: 'https://github.com/PC2005-cloud/dsh-pet' }), 'dsh-pet')
  assert.equal(dedupeKey({ npm: null, url: 'https://github.com/Awu12277/dsh-stock-watch' }), 'awu12277/dsh-stock-watch')
  // 目录里存在两个不同作者的 dsh-stock-watch —— owner/repo 去重保证两者都保留
  assert.notEqual(dedupeKey({ npm: null, url: 'https://github.com/Bob-Bo1/dsh-stock-watch' }), dedupeKey({ npm: null, url: 'https://github.com/Awu12277/dsh-stock-watch' }))
})

test('cleanCatalog: 去重保留第一条并记录 dropped', () => {
  const entries = [
    { npm: 'a', name: 'a1' },
    { npm: 'a', name: 'a2' },
    { npm: null, url: 'https://github.com/ow1/dsh-x' },
    { npm: null, url: 'https://github.com/ow1/dsh-x' },
  ]
  const { kept, dropped } = cleanCatalog(entries)
  assert.equal(kept.length, 2)
  assert.equal(dropped.length, 2)
  assert.ok(dropped.every((d) => d.reason === 'duplicate'))
})

test('cleanCatalog: 描述含 NSFW/成人/电刺激关键词 → experimental', () => {
  const zh = { npm: null, url: 'https://github.com/a/b', description: { zh: '成人向内容' } }
  const en = { npm: null, url: 'https://github.com/c/d', description: { en: 'NSFW mode' } }
  const plain = { npm: null, url: 'https://github.com/e/f', description: { zh: '普通插件' } }
  const { kept } = cleanCatalog([zh, en, plain])
  assert.equal(kept[0].experimental, true)
  assert.equal(kept[1].experimental, true)
  assert.equal(kept[2].experimental, false)
})

test('parseArgs: --limit 与 --only', () => {
  assert.deepEqual(parseArgs(['--limit', '20']), { limit: 20, only: null })
  assert.deepEqual(parseArgs(['--only', 'npm', '--limit', '5']), { limit: 5, only: 'npm' })
  assert.deepEqual(parseArgs([]), { limit: Infinity, only: null })
})

test('cleanCatalog: 描述为纯字符串也参与 experimental 判定', () => {
  const { kept } = cleanCatalog([{ npm: 'x', url: 'https://github.com/a/x', description: 'NSFW plugin' }])
  assert.equal(kept[0].experimental, true)
})

test('cleanCatalog: 同名不同作者仓库 slug 冲突 → 保留第一个，第二个记 slug-collision', () => {
  const a = { npm: null, url: 'https://github.com/Awu12277/dsh-stock-watch', install: 'dsh plugin --profile web add github:Awu12277/dsh-stock-watch' }
  const b = { npm: null, url: 'https://github.com/Bob-Bo1/dsh-stock-watch', install: 'dsh plugin --profile web add github:Bob-Bo1/dsh-stock-watch' }
  const { kept, dropped } = cleanCatalog([a, b])
  assert.equal(kept.length, 1)
  assert.equal(dropped.length, 1)
  assert.equal(dropped[0].reason, 'slug-collision')
})

test('probeEntry: npm 源从 registry 拿版本（fetch stub）', async (t) => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  const calls = []
  globalThis.fetch = async (url, opts) => {
    calls.push(url)
    return { ok: true, json: async () => ({ 'dist-tags': { latest: '1.2.3' } }) }
  }
  const r = await probeEntry({ npm: 'dsh-pet' }, { npmRegistry: 'https://registry.npmjs.org' })
  assert.equal(r.ok, true)
  assert.equal(r.version, '1.2.3')
  assert.ok(calls[0].includes('registry.npmjs.org'))
})

test('probeEntry: tarball 源 HEAD 取体积', async (t) => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  globalThis.fetch = async (url, opts) => ({ ok: true, headers: { get: () => '12345' } })
  const r = await probeEntry({ tarball: 'https://example.com/x.tgz' })
  assert.equal(r.ok, true)
  assert.equal(r.source, 'tarball')
  assert.equal(r.sizeBytes, 12345)
})

test('probeEntry: github 源 codeload HEAD 404 → 死链', async (t) => {
  const original = globalThis.fetch
  t.after(() => { globalThis.fetch = original })
  globalThis.fetch = async (url, opts) => {
    if (opts && opts.method === 'HEAD') return { ok: false, status: 404 }
    return { ok: false, status: 404 }
  }
  const r = await probeEntry({ url: 'https://github.com/gone/dsh-x', install: 'dsh plugin --profile web add github:gone/dsh-x' })
  assert.equal(r.ok, false)
  assert.match(r.error || '', /404|HEAD/i)
})

test('probeEntry: 无任何源信号 → unknown / no install command', async () => {
  const r = await probeEntry({ name: 'x', install: null })
  assert.equal(r.ok, false)
  assert.equal(r.source, 'unknown')
  assert.equal(r.error, 'no install command')
})

function makePluginDir() {
  const dir = mkdtempSync(join(tmpdir(), 'mirror-fixture-'))
  mkdirSync(join(dir, 'lib'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture-plugin', version: '0.0.1', main: 'lib/index.js' }))
  writeFileSync(join(dir, 'lib', 'index.js'), 'module.exports = {};\n')
  return dir
}

test('materializeLocalDir: 保留插件包结构并返回包根', async () => {
  const src = makePluginDir()
  const dest = mkdtempSync(join(tmpdir(), 'mirror-mat-'))
  const root = await materializeLocalDir(src, dest)
  assert.ok(existsSync(join(root, 'package.json')))
  rmSync(src, { recursive: true, force: true })
  rmSync(dest, { recursive: true, force: true })
})

test('installClosure: 空依赖插件零网络可完成（npm install 静默失败不阻断）', async () => {
  const dir = makePluginDir()
  const r = await installClosure(dir, { npmCmd: 'npm' })
  // 不联网时 npm install 可能失败——允许失败但必须返回对象且不抛异常
  assert.equal(typeof r, 'object')
  rmSync(dir, { recursive: true, force: true })
})

test('rebuildAllowlisted: 只对白名单内的包返回 rebuild 列表', () => {
  const names = rebuildAllowlisted(['sharp', 'left-pad', 'node-pty', 'koffi', 'tiny'])
  assert.deepEqual(names.sort(), ['koffi', 'node-pty', 'sharp'])
})
