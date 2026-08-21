import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slugFromSource, loadMarketManifest, resolveCache, offlineInstallPlan, offlineInstall, stampCatalogPlugins } from '../assets/plugins/dsh-webui-market/lib/host.js'

function fakeCache(dir) {
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    entries: {
      'dsh-pet': { name: 'dsh-pet', version: '0.1.4', sha256: 'x'.repeat(64), source: 'github:PC2005-cloud/dsh-pet', sizeBytes: 100 },
    },
  }))
}

test('slugFromSource: 归一化', () => {
  assert.equal(slugFromSource('github:PC2005-cloud/dsh-pet'), 'dsh-pet')
  assert.equal(slugFromSource('dsh-emoji@0.3.1'), 'dsh-emoji')
  assert.equal(slugFromSource('@scope/tool@1.0.0'), 'scope-tool')
})

test('loadMarketManifest: 无缓存根 → null', () => {
  delete process.env.DSH_DESKTOP_MARKET_CACHE
  assert.equal(loadMarketManifest(), null)
})

test('resolveCache: 命中返回 { slug, entry, tgz }', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mkt-cache-'))
  fakeCache(dir)
  process.env.DSH_DESKTOP_MARKET_CACHE = dir
  const hit = resolveCache('github:PC2005-cloud/dsh-pet')
  assert.equal(hit.slug, 'dsh-pet')
  assert.equal(hit.entry.version, '0.1.4')
  assert.equal(hit.tgz, join(dir, 'dsh-pet.tgz'))
  const miss = resolveCache('github:nobody/nothing')
  assert.equal(miss, null)
  delete process.env.DSH_DESKTOP_MARKET_CACHE
  rmSync(dir, { recursive: true, force: true })
})

test('offlineInstallPlan: local 正路径（sha256 一致）/ missing-tgz / hash 不符 / miss', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mkt-plan-'))
  process.env.DSH_DESKTOP_MARKET_CACHE = dir
  const { createHash } = await import('node:crypto')
  const correct = Buffer.from('fake-tgz-bytes')
  const realSha = createHash('sha256').update(correct).digest('hex')
  // 先写真实 sha 的 manifest + 匹配的 tgz（在首次 loadMarketManifest 之前）
  writeFileSync(join(dir, 'dsh-pet.tgz'), correct)
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    entries: { 'dsh-pet': { name: 'dsh-pet', version: '0.1.4', sha256: realSha, source: 'github:PC2005-cloud/dsh-pet', sizeBytes: correct.length } },
  }))
  // 1) local 正路径
  assert.equal((await offlineInstallPlan('github:PC2005-cloud/dsh-pet')).mode, 'local')
  // 2) tgz 删除 → missing-tgz → online
  rmSync(join(dir, 'dsh-pet.tgz'), { force: true })
  assert.equal((await offlineInstallPlan('github:PC2005-cloud/dsh-pet')).mode, 'online')
  // 3) 换内容 → hash 不符 → online
  writeFileSync(join(dir, 'dsh-pet.tgz'), 'different-bytes')
  assert.equal((await offlineInstallPlan('github:PC2005-cloud/dsh-pet')).mode, 'online')
  // 4) miss
  assert.equal((await offlineInstallPlan('github:nobody/nothing')).mode, 'online')
  delete process.env.DSH_DESKTOP_MARKET_CACHE
  rmSync(dir, { recursive: true, force: true })
})

test('stampCatalogPlugins: 离线打标 + experimental 透传（纯函数，快照路径也走它）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mkt-stamp-'))
  process.env.DSH_DESKTOP_MARKET_CACHE = dir
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    entries: { 'dsh-pet': { name: 'dsh-pet', version: '0.1.4', sha256: 'y'.repeat(64), source: 'github:PC2005-cloud/dsh-pet', sizeBytes: 4 } },
  }))
  const plugins = [
    { name: 'a', source: 'github:PC2005-cloud/dsh-pet' },
    { name: 'b', source: 'github:nobody/nothing' },
    { name: 'c', source: 'github:x/y', experimental: true },
    { name: 'd', source: 'github:z/w', experimental: false },
  ]
  stampCatalogPlugins(plugins)
  assert.equal(plugins[0].offline, true)
  assert.equal(plugins[1].offline, undefined)
  assert.equal(plugins[2].experimental, true)
  assert.equal(plugins[3].experimental, false)
  delete process.env.DSH_DESKTOP_MARKET_CACHE
  rmSync(dir, { recursive: true, force: true })
})

test('offlineInstall: 解包落地 + patch 行 + 依赖记录（fixture tgz，临时 DSH_HOME）', async () => {
  const { mkdirSync, createWriteStream } = await import('node:fs')
  const archiver = (await import('archiver')).default
  const home = mkdtempSync(join(tmpdir(), 'mkt-home-'))
  const oldHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    // 1) fixture tgz：带顶层目录（GitHub release 资产形态）
    const src = mkdtempSync(join(tmpdir(), 'mkt-offsrc-'))
    mkdirSync(join(src, 'lib'), { recursive: true })
    writeFileSync(join(src, 'package.json'), JSON.stringify({ name: 'off-plugin', version: '0.0.1', main: 'lib/index.js', dsh: { client: { platform: 'web' } } }))
    writeFileSync(join(src, 'lib', 'index.js'), 'module.exports = {};\n')
    const tgz = join(tmpdir(), `off-${Date.now()}.tgz`)
    await new Promise((resolve, reject) => {
      const out = createWriteStream(tgz)
      const a = archiver('tar', { gzip: true })
      a.on('error', reject); out.on('close', resolve)
      a.pipe(out); a.directory(src, 'owner-repo-sha/'); a.finalize()
    })
    // 2) 构造 plan（sha256 随意——offlineInstall 不再校验 sha，由 offlineInstallPlan 负责）
    const plan = { tgz, entry: { source: 'github:owner/off-plugin' } }
    const r = await offlineInstall('web', plan)
    assert.equal(r.ok, true)
    assert.equal(r.name, 'off-plugin')
    assert.equal(r.isBundle, false)
    assert.equal(r.isClient, true)
    const prof = join(home, 'profiles', 'web')
    // 3) 双落地 + patch 行 + 依赖记录
    assert.ok((await import('node:fs')).existsSync(join(prof, 'vendor-local', 'off-plugin', 'package.json')))
    assert.ok((await import('node:fs')).existsSync(join(prof, 'node_modules', 'off-plugin', 'package.json')))
    const patch = (await import('node:fs')).readFileSync(join(prof, 'cordis.patch.yml'), 'utf8')
    assert.match(patch, /name: 'off-plugin'/)
    const manifest = JSON.parse((await import('node:fs')).readFileSync(join(prof, 'package.json'), 'utf8'))
    assert.equal(manifest.dependencies['off-plugin'], 'link:vendor-local/off-plugin')
    // 4) 幂等：再装一次不重复写行
    const r2 = await offlineInstall('web', plan)
    assert.equal(r2.ok, true)
    const patch2 = (await import('node:fs')).readFileSync(join(prof, 'cordis.patch.yml'), 'utf8')
    assert.equal((patch2.match(/name: 'off-plugin'/g) || []).length, 1)
  } finally {
    delete process.env.DSH_HOME
    if (oldHome !== undefined) process.env.DSH_HOME = oldHome
    rmSync(home, { recursive: true, force: true })
  }
})

test('offlineInstall: 非法包名 ../../evil 被 Fix A 拒绝（零写入）', async () => {
  const { mkdirSync, createWriteStream } = await import('node:fs')
  const archiver = (await import('archiver')).default
  const src = mkdtempSync(join(tmpdir(), 'mkt-evil-'))
  mkdirSync(join(src, 'lib'), { recursive: true })
  writeFileSync(join(src, 'package.json'), JSON.stringify({ name: '../../evil', version: '0.0.1', main: 'lib/index.js', dsh: { client: { platform: 'web' } } }))
  writeFileSync(join(src, 'lib', 'index.js'), 'module.exports = {};\n')
  const tgz = join(tmpdir(), `evil-${Date.now()}.tgz`)
  await new Promise((resolve, reject) => {
    const out = createWriteStream(tgz)
    const a = archiver('tar', { gzip: true })
    a.on('error', reject); out.on('close', resolve)
    a.pipe(out); a.directory(src, 'owner-repo-sha/'); a.finalize()
  })
  const r = await offlineInstall('web', { tgz, entry: { source: 'github:owner/evil' } })
  assert.equal(r.ok, false)
  assert.match(String(r.error), /非法包名/)
  rmSync(src, { recursive: true, force: true })
  rmSync(tgz, { force: true })
})
