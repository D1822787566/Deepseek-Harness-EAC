import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const bundlePath = new URL('../assets/plugins/dsh-webui-market/lib/client.js', import.meta.url);
const bundle = fs.readFileSync(bundlePath, 'utf8');

function loadCore() {
  const context = {
    window: {
      __ModuleLoader__: {
        load() {},
      },
    },
  };
  vm.runInNewContext(bundle, context, { filename: bundlePath.pathname });
  assert.ok(context.window.__dshMarketFilterCore, 'bundle must expose the pure filter core');
  return context.window.__dshMarketFilterCore;
}

const fixtures = [
  { name: 'Offline Tool', category: 'tools', offline: true, installed: false },
  { name: 'Online Tool', category: 'tools', offline: false, installed: false },
  { name: 'Offline Theme', category: 'themes', offline: true, installed: false },
  { name: 'Hidden Lab', category: 'tools', offline: true, experimental: true, installed: true },
];

test('bundle exposes the pure filter core', () => {
  loadCore();
  assert.match(bundle, /仅看离线包/);
  assert.match(bundle, /Offline only/);
});

test('default filtering retains online and offline non-experimental plugins', () => {
  const core = loadCore();
  assert.deepEqual(
    core.filter(fixtures).map((plugin) => plugin.name),
    ['Offline Tool', 'Online Tool', 'Offline Theme'],
  );
});

test('offline-only filtering keeps offline plugins and excludes experiments by default', () => {
  const core = loadCore();
  assert.deepEqual(
    core.filter(fixtures, { offlineOnly: true }).map((plugin) => plugin.name),
    ['Offline Tool', 'Offline Theme'],
  );
});

test('offline-only composes with category, search, installed, and experimental filters', () => {
  const core = loadCore();
  assert.deepEqual(
    core.filter(fixtures, {
      offlineOnly: true,
      category: 'tools',
      query: 'lab',
      installedOnly: true,
      showExperimental: true,
    }).map((plugin) => plugin.name),
    ['Hidden Lab'],
  );
});

test('countOffline counts the complete catalog and a category subset', () => {
  const core = loadCore();
  assert.equal(core.countOffline(fixtures), 3);
  assert.equal(core.countOffline(fixtures.filter((plugin) => plugin.category === 'themes')), 1);
});
