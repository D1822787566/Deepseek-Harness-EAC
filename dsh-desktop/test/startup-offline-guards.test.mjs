import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mainSource = readFileSync(join(root, 'main.js'), 'utf8');

function functionBody(name) {
  const start = mainSource.indexOf(`async function ${name}(manual) {`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = mainSource.indexOf('\nasync function ', start + 1);
  return mainSource.slice(start, next === -1 ? undefined : next);
}

test('automatic update flows short-circuit while offline but manual flows remain available', () => {
  for (const name of ['runUpdateFlow', 'runClientUpdateFlow', 'runPluginUpdateCheck']) {
    const body = functionBody(name);
    assert.match(
      body,
      /if\s*\(\s*!manual\s*&&\s*updater\.offlineMode\(updCtx\(\)\)\s*\)\s*return\s*;/,
      `${name} must not make automatic network requests in offline mode`,
    );
  }
});

test('boot does not schedule automatic update checks while offline', () => {
  assert.match(mainSource, /const\s+offline\s*=\s*updater\.offlineMode\(updCtx\(\)\)\s*;/);
  for (const envName of ['DSH_DESKTOP_SKIP_AUTO_UPDATE', 'DSH_DESKTOP_SKIP_CLIENT_UPDATE', 'DSH_DESKTOP_SKIP_PLUGIN_UPDATE']) {
    assert.match(
      mainSource,
      new RegExp(`if\\s*\\(\\s*!offline\\s*&&\\s*!process\\.env\\.${envName}\\s*\\)`),
      `${envName} scheduling must be gated by offline mode`,
    );
  }
});

test('boot records phase timing around the blocking startup path', () => {
  assert.match(mainSource, /function\s+createBootTimer\s*\(/);
  for (const stage of ['profile-sync', 'koffi-preflight', 'profile-prepare', 'bundle-integrity', 'web-ui-ready', 'boot-ready']) {
    assert.match(mainSource, new RegExp(`bootTimer\\.mark\\(['"]${stage}['"]\\)`));
  }
});

test('embedded dsh web never opens an external browser', () => {
  assert.match(mainSource, /String\(webPort\),\s*['"]--no-open['"]/);
});

test('shutdown closes logging defensively against late child-process events', () => {
  assert.match(mainSource, /if\s*\(loggingClosed\)\s*return\s*;/);
  assert.match(mainSource, /!desktopLog\.writableEnded\s*&&\s*!desktopLog\.destroyed/);
  assert.match(mainSource, /proc\.once\(['"]close['"][\s\S]*?out\.end\(\)/);
  assert.match(mainSource, /loggingClosed\s*=\s*true;[\s\S]*?desktopLog\s*=\s*null;/);
});
