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

const PLUGINS = [
  { name: 'Offline Tool', cat: 'tools', offline: true },
  { name: 'Online Tool', cat: 'tools', offline: false },
  { name: 'Offline Theme', cat: 'themes', offline: true },
  { name: 'Hidden Lab', cat: 'tools', offline: true, experimental: true },
];

test('bundle exposes the pure filter core', () => {
  const core = loadCore();
  assert.deepEqual(Object.keys(core).sort(), ['countOffline', 'filterPlugins']);
  assert.match(bundle, /仅看离线包/);
  assert.match(bundle, /Offline only/);
});

test('default filtering retains online and offline non-experimental plugins', () => {
  const core = loadCore();
  assert.deepEqual(
    Array.from(core.filterPlugins(PLUGINS), (plugin) => plugin.name),
    ['Offline Tool', 'Online Tool', 'Offline Theme'],
  );
});

test('offline-only filtering keeps offline plugins and excludes experiments by default', () => {
  const core = loadCore();
  assert.deepEqual(
    Array.from(core.filterPlugins(PLUGINS, { showOffline: true }), (plugin) => plugin.name),
    ['Offline Tool', 'Offline Theme'],
  );
});

test('offline-only composes with cat, search, installed, and experimental filters', () => {
  const core = loadCore();
  const composedPlugins = [
    ...PLUGINS,
    { name: 'Lab Wrong Cat', cat: 'themes', offline: true, experimental: true },
    { name: 'Lab Uninstalled', cat: 'tools', offline: true, experimental: true },
    { name: 'Lab Online', cat: 'tools', offline: false, experimental: true },
  ];
  const installed = new Set(['Hidden Lab']);
  installed.add('Offline Tool');
  installed.add('Lab Wrong Cat');
  installed.add('Lab Online');
  assert.deepEqual(
    Array.from(core.filterPlugins(composedPlugins, {
      showOffline: true,
      cat: 'tools',
      query: 'lab',
      showInstalled: true,
      showExperimental: true,
      isInstalled: (plugin) => installed.has(plugin.name),
    }), (plugin) => plugin.name),
    ['Hidden Lab'],
  );
});

test('countOffline counts the original catalog and a themes subset', () => {
  const core = loadCore();
  core.filterPlugins(PLUGINS, { showOffline: true });
  assert.equal(core.countOffline(PLUGINS), 3);
  core.filterPlugins(PLUGINS, { cat: 'themes' });
  assert.equal(core.countOffline(PLUGINS), 3);
  assert.equal(core.countOffline(PLUGINS.filter((plugin) => plugin.cat === 'themes')), 1);
});
