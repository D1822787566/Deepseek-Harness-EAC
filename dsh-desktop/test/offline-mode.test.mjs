import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { offlineMode } = require(join(root, 'updater.js'));

// 每个用例独立临时 userDataDir，互不污染；DSH_DESKTOP_OFFLINE 是全局环境
// 变量，测试前后必须保存/还原。
const ENV_KEY = 'DSH_DESKTOP_OFFLINE';

function withEnv(value, fn) {
  const prev = process.env[ENV_KEY];
  if (value === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = value;
  try { return fn(); }
  finally {
    if (prev === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prev;
  }
}

function ctxWithSettings(settings) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'dsh-offline-test-'));
  if (settings !== undefined) writeFileSync(join(userDataDir, 'settings.json'), JSON.stringify(settings));
  return { userDataDir, nodeExe: () => '', npmCli: () => '', log: () => {} };
}

function cleanup(ctx) {
  try { rmSync(ctx.userDataDir, { recursive: true, force: true }); } catch {}
}

test('默认（无 settings.json）→ 离线模式开启（内网优先）', () => {
  const ctx = ctxWithSettings(undefined);
  try { assert.equal(offlineMode(ctx), true, '未配置时默认离线，避免内网启动卡顿'); }
  finally { cleanup(ctx); }
});

test('settings.json 未含 offlineMode 键 → 离线模式开启', () => {
  const ctx = ctxWithSettings({ pluginOnboardingDone: true });
  try { assert.equal(offlineMode(ctx), true); }
  finally { cleanup(ctx); }
});

test('settings.json offlineMode: false → 联网模式', () => {
  const ctx = ctxWithSettings({ offlineMode: false });
  try { assert.equal(offlineMode(ctx), false); }
  finally { cleanup(ctx); }
});

test('settings.json offlineMode: true → 离线模式', () => {
  const ctx = ctxWithSettings({ offlineMode: true });
  try { assert.equal(offlineMode(ctx), true); }
  finally { cleanup(ctx); }
});

test('损坏的 settings.json → 离线模式（容错回默认）', () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'dsh-offline-test-'));
  writeFileSync(join(userDataDir, 'settings.json'), '{ 这不是 JSON');
  const ctx = { userDataDir, nodeExe: () => '', npmCli: () => '', log: () => {} };
  try { assert.equal(offlineMode(ctx), true); }
  finally { cleanup(ctx); }
});

test('DSH_DESKTOP_OFFLINE=0 强制联网（覆盖 settings.offlineMode: true）', () => {
  const ctx = ctxWithSettings({ offlineMode: true });
  try { withEnv('0', () => assert.equal(offlineMode(ctx), false)); }
  finally { cleanup(ctx); }
});

test('DSH_DESKTOP_OFFLINE=1 强制离线（覆盖 settings.offlineMode: false）', () => {
  const ctx = ctxWithSettings({ offlineMode: false });
  try { withEnv('1', () => assert.equal(offlineMode(ctx), true)); }
  finally { cleanup(ctx); }
});

test('DSH_DESKTOP_OFFLINE 未设置时不受残留值影响', () => {
  const ctx = ctxWithSettings({ offlineMode: false });
  try { withEnv(undefined, () => assert.equal(offlineMode(ctx), false)); }
  finally { cleanup(ctx); }
});
