import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { RECOMMENDED_PLUGIN_IDS, buildCatalog } from '../scripts/onboarding.js';

const DESKTOP_DIR = join(import.meta.dirname, '..');
const PLUGIN_DIR = join(DESKTOP_DIR, 'assets', 'plugins', 'dsh-dream-skin');

function companionPlugins() {
  const source = readFileSync(join(DESKTOP_DIR, 'main.js'), 'utf8');
  const match = /const COMPANION_PLUGINS = (\[[\s\S]*?\n\]);/.exec(source);
  assert.ok(match, 'main.js should define COMPANION_PLUGINS');
  return vm.runInNewContext(`(${match[1]})`);
}

function bundledPluginFiles(dir = PLUGIN_DIR, prefix = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...bundledPluginFiles(join(dir, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

test('bundles the dsh-dream-skin v0.3.0 web plugin manifest', () => {
  const manifestPath = join(PLUGIN_DIR, 'package.json');
  assert.ok(existsSync(manifestPath), 'bundled package.json should exist');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'dsh-dream-skin');
  assert.equal(manifest.version, '0.3.0');
  assert.equal(manifest.main, 'lib/index.js');
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh?.client?.platform, 'web');
});

test('bundles exactly the required dream-skin runtime and documentation assets', () => {
  const expected = [
    'LICENSE',
    'README.en.md',
    'README.md',
    'cordis.patch.yml',
    'lib/client.js',
    'lib/index.js',
    'lib/types/client/index.d.ts',
    'lib/types/index.d.ts',
    'package.json',
  ].sort();
  assert.deepEqual(bundledPluginFiles(), expected);

  const patch = readFileSync(join(PLUGIN_DIR, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /^\s*- insert:\s*$[\s\S]*?^\s+- id:\s*dream-skin\s*$/m);
  assert.match(patch, /^\s+name:\s*['"]dsh-dream-skin['"]\s*$/m);
});

test('vendored dream-skin client does not load Google Fonts remotely', () => {
  const client = readFileSync(join(PLUGIN_DIR, 'lib', 'client.js'), 'utf8');
  assert.doesNotMatch(client, /fonts\.(?:googleapis|gstatic)\.com/i);
  assert.doesNotMatch(
    client,
    /@import\s+(?:url\()?\s*['"]?https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\b/i,
  );
});

test('registers dream-skin as an enabled companion plugin', () => {
  const plugin = companionPlugins().find(({ id }) => id === 'dream-skin');
  assert.ok(plugin, 'COMPANION_PLUGINS should contain dream-skin');
  assert.equal(plugin.name, 'dsh-dream-skin');
  assert.notEqual(plugin.disabled, true);
});

test('recommends dream-skin in the first-start catalog', () => {
  assert.equal(RECOMMENDED_PLUGIN_IDS.has('dream-skin'), true);
  const catalog = buildCatalog(companionPlugins(), {
    recommendedIds: RECOMMENDED_PLUGIN_IDS,
  });
  const plugin = catalog.find(({ id }) => id === 'dream-skin');
  assert.ok(plugin, 'catalog should contain dream-skin');
  assert.equal(plugin.recommended, true);
  assert.equal(plugin.registryDisabled, false);
});
