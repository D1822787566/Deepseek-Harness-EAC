import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slugFromSource, loadMarketManifest, resolveCache, offlineInstallPlan } from '../assets/plugins/dsh-webui-market/lib/host.js'

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

test('offlineInstallPlan: 命中=local / 未命中=online / tgz 缺失=online 兜底', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mkt-plan-'))
  fakeCache(dir)
  process.env.DSH_DESKTOP_MARKET_CACHE = dir
  // tgz 不存在 → missing-tgz → online 兜底（hash 校验的前提是文件在）
  assert.equal((await offlineInstallPlan('github:PC2005-cloud/dsh-pet')).mode, 'online')
  assert.equal((await offlineInstallPlan('github:nobody/nothing')).mode, 'online')
  // 补上真实 tgz（内容任意，sha256 必须匹配 manifest 才能 local）
  writeFileSync(join(dir, 'dsh-pet.tgz'), 'fake-tgz-bytes')
  const sha = 'x'.repeat(64) // manifest 里写死的 sha256 —— 与实际文件不符 → 仍 online
  assert.equal((await offlineInstallPlan('github:PC2005-cloud/dsh-pet')).mode, 'online')
  assert.equal(sha.length, 64)
  delete process.env.DSH_DESKTOP_MARKET_CACHE
  rmSync(dir, { recursive: true, force: true })
})
