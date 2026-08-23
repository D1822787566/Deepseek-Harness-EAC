import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('bundles only the required dream-skin runtime and documentation assets', () => {
  for (const relative of [
    'cordis.patch.yml',
    'lib/index.js',
    'lib/client.js',
    'lib/types/index.d.ts',
    'LICENSE',
    'README.md',
    'README.en.md',
  ]) {
    assert.ok(existsSync(join(PLUGIN_DIR, relative)), `missing bundled asset: ${relative}`);
  }
  for (const excluded of ['.github', 'tests', 'wallpapers', 'docs']) {
    assert.equal(existsSync(join(PLUGIN_DIR, excluded)), false, `must not bundle: ${excluded}`);
  }

  const patch = readFileSync(join(PLUGIN_DIR, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /^\s*- insert:\s*$[\s\S]*?^\s+- id:\s*dream-skin\s*$/m);
  assert.match(patch, /^\s+name:\s*['"]dsh-dream-skin['"]\s*$/m);
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
