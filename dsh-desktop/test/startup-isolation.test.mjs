// Startup isolation contracts are source-level because main.js is an Electron
// entry point with process side effects and cannot be imported under node:test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mainSrc = readFileSync(join(ROOT, 'main.js'), 'utf8');

test('ensureDesktopProfileInit resolves home before using the shared profile node_modules path', () => {
  const initStart = mainSrc.indexOf('function ensureDesktopProfileInit()');
  const initEnd = mainSrc.indexOf('\n// ---------------------------------------------------------------------------', initStart + 1);
  assert.ok(initStart >= 0, 'ensureDesktopProfileInit() missing');
  assert.ok(initEnd > initStart, 'could not isolate ensureDesktopProfileInit()');

  const initSrc = mainSrc.slice(initStart, initEnd);
  const homeResolution = initSrc.search(/(?:const|let|var)\s+home\s*=\s*dshHome\s*\|\|\s*path\.join\(\s*os\.homedir\(\)\s*,\s*['"]\.dsh['"]\s*\)/);
  const sharedNodeModules = initSrc.search(/path\.join\(\s*home\s*,\s*['"]profiles['"]\s*,\s*['"]node_modules['"]\s*\)/);

  assert.ok(homeResolution >= 0, 'ensureDesktopProfileInit() must resolve an effective home');
  assert.ok(sharedNodeModules >= 0, 'shared profile node_modules path is missing');
  assert.ok(homeResolution < sharedNodeModules, 'home must be resolved before building profile paths');
});

test('desktop userdata is configured before the single-instance lock and outside boot()', () => {
  const lifecycleStart = mainSrc.indexOf('// App lifecycle');
  const lock = mainSrc.indexOf('app.requestSingleInstanceLock()', lifecycleStart);
  const bootSrc = mainSrc.slice(mainSrc.indexOf('async function boot()'), lifecycleStart);
  const lifecycleSrc = mainSrc.slice(lifecycleStart, lock);
  const firstExecutable = lifecycleSrc
    .replace(/^(?:\s*\/\/[^\r\n]*(?:\r?\n|$))+/, '')
    .replace(/^\s*try\s*\{\s*/, '')
    .replace(/^(?:\s*\/\/[^\r\n]*(?:\r?\n|$))+/, '')
    .trimStart();
  const userDataBranches = /^if\s*\(\s*!app\.isPackaged\s*&&\s*process\.env\.DSH_DESKTOP_USERDATA\s*\)\s*\{[\s\S]*?app\.setPath\(\s*['"]userData['"]\s*,\s*process\.env\.DSH_DESKTOP_USERDATA\s*\)\s*;?[\s\S]*?\}\s*else\s+if\s*\(\s*process\.env\.PORTABLE_EXECUTABLE_DIR\s*\)\s*\{[\s\S]*?app\.setPath\(\s*['"]userData['"]\s*,\s*path\.join\(\s*process\.env\.PORTABLE_EXECUTABLE_DIR\s*,\s*['"]data['"]\s*\)\s*\)/;

  assert.ok(lifecycleStart >= 0, 'App lifecycle section missing');
  assert.ok(lock >= 0, 'single-instance lock missing');
  assert.equal(/app\.setPath\(\s*['"]userData['"]/.test(bootSrc), false, 'userData setup must be outside boot()');
  assert.match(firstExecutable, userDataBranches, 'userData conditional must be the first lifecycle statement before the lock');
});

test('desktop userdata directories are created before app.setPath()', () => {
  const lifecycleStart = mainSrc.indexOf('// App lifecycle');
  const lock = mainSrc.indexOf('app.requestSingleInstanceLock()', lifecycleStart);
  const lifecycleSrc = mainSrc.slice(lifecycleStart, lock);
  const developmentMkdir = lifecycleSrc.search(/fs\.mkdirSync\(\s*process\.env\.DSH_DESKTOP_USERDATA\s*,\s*\{\s*recursive\s*:\s*true\s*\}\s*\)/);
  const developmentSetPath = lifecycleSrc.search(/app\.setPath\(\s*['"]userData['"]\s*,\s*process\.env\.DSH_DESKTOP_USERDATA\s*\)/);
  const portableMkdir = lifecycleSrc.search(/fs\.mkdirSync\(\s*path\.join\(\s*process\.env\.PORTABLE_EXECUTABLE_DIR\s*,\s*['"]data['"]\s*\)\s*,\s*\{\s*recursive\s*:\s*true\s*\}\s*\)/);
  const portableSetPath = lifecycleSrc.search(/app\.setPath\(\s*['"]userData['"]\s*,\s*path\.join\(\s*process\.env\.PORTABLE_EXECUTABLE_DIR\s*,\s*['"]data['"]\s*\)\s*\)/);

  assert.ok(developmentMkdir >= 0, 'development userData directory must be created recursively');
  assert.ok(developmentSetPath >= 0, 'development userData path setup is missing');
  assert.ok(developmentMkdir < developmentSetPath, 'development userData directory must exist before app.setPath()');
  assert.ok(portableMkdir >= 0, 'portable userData directory must be created recursively');
  assert.ok(portableSetPath >= 0, 'portable userData path setup is missing');
  assert.ok(portableMkdir < portableSetPath, 'portable userData directory must exist before app.setPath()');
});

test('early userdata setup logs failures and terminates before the lock', () => {
  const lifecycleStart = mainSrc.indexOf('// App lifecycle');
  const lock = mainSrc.indexOf('app.requestSingleInstanceLock()', lifecycleStart);
  const lifecycleSrc = mainSrc.slice(lifecycleStart, lock);

  assert.match(lifecycleSrc, /try\s*\{[\s\S]*?app\.setPath\(\s*['"]userData['"]/, 'early userData setup must guard filesystem/path setup');
  assert.match(lifecycleSrc, /catch\s*\([^)]*\)\s*\{[\s\S]*?(?:log|console\.error)\(/, 'early setup failures must be explicitly logged');
  assert.match(lifecycleSrc, /catch\s*\([^)]*\)\s*\{[\s\S]*?app\.exit\(\s*[1-9]\d*\s*\)/, 'early setup failures must terminate with nonzero exit');
});
