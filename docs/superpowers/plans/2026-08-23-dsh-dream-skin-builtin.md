# dsh-dream-skin Built-in Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendor local `dsh-dream-skin` v0.3.0 into the desktop application, register it as a built-in plugin, and enable it by default on every new-user path.

**Architecture:** Store a slim, offline snapshot under `dsh-desktop/assets/plugins/dsh-dream-skin` and reuse the existing `COMPANION_PLUGINS` synchronization path for profile copying, patch insertion, collision takeover, removal, and built-in markers. Mark `dream-skin` as recommended so the first-run selection wizard defaults it on without making it non-removable.

**Tech Stack:** Electron main process (CommonJS), DSH dual-face plugin package (ES modules), Node.js built-in test runner, Windows file-copy tools.

---

## File map

- Create `dsh-desktop/assets/plugins/dsh-dream-skin/`: offline runtime snapshot copied from `E:\project_space\dshtest\dsh-dream-skin`; vendored `lib/client.js` carries one approved offline patch that removes the Google Fonts remote `@import`.
- Create `dsh-desktop/test/dream-skin-builtin.test.mjs`: integration contract for asset shape, packaged README inclusion order, network boundary, loader identity, built-in registration, and first-run recommendation.
- Modify `dsh-desktop/main.js`: add the plugin to `COMPANION_PLUGINS` with no `disabled` flag.
- Modify `dsh-desktop/scripts/onboarding.js`: add `dream-skin` to the recommended default selection.
- Modify `dsh-desktop/electron-builder.yml`: after the global Markdown exclusion, explicitly re-include Dream Skin's `README.md` and `README.en.md`; add an independent FileSet for `lib/types/**/*.d.ts` so electron-builder's automatic main-matcher exclusion cannot remove the declarations.

### Task 1: Add the failing built-in integration contract

**Files:**
- Create: `dsh-desktop/test/dream-skin-builtin.test.mjs`
- Read: `dsh-desktop/main.js:3067-3155`
- Read: `dsh-desktop/scripts/onboarding.js:14-43`

- [ ] **Step 1: Verify the local source snapshot before importing it**

Run from `dsh-desktop/`:

```bat
node --test E:\project_space\dshtest\dsh-dream-skin\tests\client.smoke.test.cjs
```

Expected: all upstream smoke tests pass. If they fail, stop before copying because the chosen local source is not a clean integration baseline.

- [ ] **Step 2: Write the failing integration test**

Create `dsh-desktop/test/dream-skin-builtin.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECOMMENDED_PLUGIN_IDS, buildCatalog } from '../scripts/onboarding.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_ROOT = path.resolve(HERE, '..');
const PLUGIN_DIR = path.join(DESKTOP_ROOT, 'assets', 'plugins', 'dsh-dream-skin');

test('dsh-dream-skin ships as a slim valid built-in asset', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'dsh-dream-skin');
  assert.equal(pkg.version, '0.3.0');
  assert.equal(pkg.main, 'lib/index.js');
  assert.deepEqual(pkg.dsh.bundle, { patch: './cordis.patch.yml' });
  assert.equal(pkg.dsh.client.platform, 'web');

  for (const relative of [
    'cordis.patch.yml',
    'lib/index.js',
    'lib/client.js',
    'lib/types/index.d.ts',
    'LICENSE',
    'README.md',
    'README.en.md',
  ]) {
    assert.ok(fs.existsSync(path.join(PLUGIN_DIR, relative)), `missing built-in asset: ${relative}`);
  }

  const patch = fs.readFileSync(path.join(PLUGIN_DIR, 'cordis.patch.yml'), 'utf8');
  assert.match(patch, /- id: dream-skin\s+name: 'dsh-dream-skin'/);

  for (const excluded of ['.github', 'tests', 'wallpapers', 'docs']) {
    assert.equal(fs.existsSync(path.join(PLUGIN_DIR, excluded)), false, `development-only directory copied: ${excluded}`);
  }
});

test('dsh-dream-skin is registered as enabled-by-default companion plugin', () => {
  const source = fs.readFileSync(path.join(DESKTOP_ROOT, 'main.js'), 'utf8');
  const registry = /const COMPANION_PLUGINS = \[([\s\S]*?)\n\];/.exec(source);
  assert.ok(registry, 'COMPANION_PLUGINS registry not found');

  const row = /\{\s*id:\s*'dream-skin',\s*name:\s*'dsh-dream-skin'([^}]*)\}/.exec(registry[1]);
  assert.ok(row, 'dream-skin registry row missing');
  assert.doesNotMatch(row[1], /disabled\s*:\s*true/, 'dream-skin must default to enabled');
});

test('first-run onboarding recommends dsh-dream-skin', () => {
  assert.ok(RECOMMENDED_PLUGIN_IDS.has('dream-skin'));
  const [entry] = buildCatalog([{ id: 'dream-skin', name: 'dsh-dream-skin' }]);
  assert.equal(entry.recommended, true);
  assert.equal(entry.registryDisabled, false);
});
```

- [ ] **Step 3: Run the test and verify the expected red state**

Run:

```bat
node --test test\dream-skin-builtin.test.mjs
```

Expected: FAIL because `assets/plugins/dsh-dream-skin/package.json` does not exist, the registry row is absent, and `RECOMMENDED_PLUGIN_IDS` does not contain `dream-skin`.

### Task 2: Vendor the slim local plugin snapshot

**Files:**
- Create: `dsh-desktop/assets/plugins/dsh-dream-skin/package.json`
- Create: `dsh-desktop/assets/plugins/dsh-dream-skin/cordis.patch.yml`
- Create: `dsh-desktop/assets/plugins/dsh-dream-skin/lib/**`
- Create: `dsh-desktop/assets/plugins/dsh-dream-skin/LICENSE`
- Create: `dsh-desktop/assets/plugins/dsh-dream-skin/README.md`
- Create: `dsh-desktop/assets/plugins/dsh-dream-skin/README.en.md`

- [ ] **Step 1: Create the target directory**

Run from `dsh-desktop/`:

```bat
mkdir assets\plugins\dsh-dream-skin
```

Expected: the empty target directory is created beneath the existing built-in plugin assets.

- [ ] **Step 2: Copy the root distribution files**

Run:

```bat
copy /Y E:\project_space\dshtest\dsh-dream-skin\package.json assets\plugins\dsh-dream-skin\
copy /Y E:\project_space\dshtest\dsh-dream-skin\cordis.patch.yml assets\plugins\dsh-dream-skin\
copy /Y E:\project_space\dshtest\dsh-dream-skin\LICENSE assets\plugins\dsh-dream-skin\
copy /Y E:\project_space\dshtest\dsh-dream-skin\README.md assets\plugins\dsh-dream-skin\
copy /Y E:\project_space\dshtest\dsh-dream-skin\README.en.md assets\plugins\dsh-dream-skin\
```

Expected: each command reports `1 file(s) copied`.

- [ ] **Step 3: Copy the complete runtime and type tree**

Run:

```bat
xcopy E:\project_space\dshtest\dsh-dream-skin\lib assets\plugins\dsh-dream-skin\lib /E /I /Y
```

Expected: `lib/index.js`, `lib/client.js`, and `lib/types/**` are copied; `.github`, `tests`, `wallpapers`, and `docs` remain absent. Before handoff, apply the approved one-line offline patch to vendored `lib/client.js` by deleting only the Google Fonts remote `@import`.

Keep the type declarations in the packaged app with an independent electron-builder FileSet:

```yaml
  - from: assets/plugins/dsh-dream-skin/lib/types
    to: assets/plugins/dsh-dream-skin/lib/types
    filter:
      - "**/*.d.ts"
```

`from` and `to` intentionally use the same app-relative directory, so `index.d.ts` and `client/index.d.ts` land directly under `app/assets/plugins/dsh-dream-skin/lib/types` without another nested `types` segment. The object FileSet becomes a matcher separate from the app-root matcher and therefore does not receive electron-builder's automatic `!**/*.{...,d.ts,...}` exclusion.

- [ ] **Step 4: Verify source fidelity and the one-line offline adaptation**

Run:

```bat
fc /B E:\project_space\dshtest\dsh-dream-skin\lib\index.js assets\plugins\dsh-dream-skin\lib\index.js
git diff --no-index --exit-code E:\project_space\dshtest\dsh-dream-skin\lib\types assets\plugins\dsh-dream-skin\lib\types
fc /B E:\project_space\dshtest\dsh-dream-skin\package.json assets\plugins\dsh-dream-skin\package.json
fc /B E:\project_space\dshtest\dsh-dream-skin\cordis.patch.yml assets\plugins\dsh-dream-skin\cordis.patch.yml
fc /B E:\project_space\dshtest\dsh-dream-skin\LICENSE assets\plugins\dsh-dream-skin\LICENSE
fc /B E:\project_space\dshtest\dsh-dream-skin\README.md assets\plugins\dsh-dream-skin\README.md
fc /B E:\project_space\dshtest\dsh-dream-skin\README.en.md assets\plugins\dsh-dream-skin\README.en.md
git diff --no-index --unified=0 E:\project_space\dshtest\dsh-dream-skin\lib\client.js assets\plugins\dsh-dream-skin\lib\client.js
node --test test\dream-skin-builtin.test.mjs
```

Expected: all distribution files except `lib/client.js` are byte-identical and their comparison commands exit 0. The client diff exits 1 because it contains exactly one approved deletion: the `fonts.googleapis.com` remote `@import`; no other client lines differ. The integration test passes, enforces that neither `fonts.googleapis.com` nor `fonts.gstatic.com` can appear in the vendored client, verifies that electron-builder re-includes both Dream Skin README files after `!**/*.md`, and uses the installed app-builder-lib's real `getMainFileMatchers` plus each matcher's `createFilter` to prove both `.d.ts` files are included by an effective matcher.

- [ ] **Step 5: Run syntax checks on the copied JavaScript**

Run:

```bat
node --check assets\plugins\dsh-dream-skin\lib\index.js
node --check assets\plugins\dsh-dream-skin\lib\client.js
```

Expected: both commands exit 0 with no output.

### Task 3: Register and recommend the built-in plugin

**Files:**
- Modify: `dsh-desktop/main.js:3072-3076`
- Modify: `dsh-desktop/scripts/onboarding.js:25-43`

- [ ] **Step 1: Add the companion registry row**

In `dsh-desktop/main.js`, place the Dream Skin row beside the existing skin plugin:

```js
  { id: 'skin-switch', name: '@deepseek-ai/dsh-skin-switch' },
  { id: 'dream-skin', name: 'dsh-dream-skin' },
  { id: 'easy-setup', name: '@deepseek-ai/dsh-easy-setup' },
```

Do not add `disabled: true`. The existing `dirName` fallback resolves the unscoped package to `assets/plugins/dsh-dream-skin`.

- [ ] **Step 2: Make the first-run wizard select it by default**

In `dsh-desktop/scripts/onboarding.js`, add `dream-skin` next to the existing skin recommendation:

```js
const RECOMMENDED_PLUGIN_IDS = new Set([
  'skin-switch',
  'dream-skin',
  'easy-setup',
```

- [ ] **Step 3: Run the focused integration tests**

Run from `dsh-desktop/`:

```bat
node --test test\dream-skin-builtin.test.mjs test\onboarding-selection.test.mjs test\builtin-collision.test.mjs test\bundled-files.test.mjs
```

Expected: all tests pass. This proves the source asset contract, packaged README re-include order, effective matcher coverage for both type declarations, default registration, first-run selection, existing same-name takeover behavior, and general electron-builder runtime file coverage remain valid.

- [ ] **Step 4: Run syntax checks for modified code**

Run:

```bat
node --check main.js
node --check scripts\onboarding.js
```

Expected: both commands exit 0 with no output.

- [ ] **Step 5: Commit the implementation slice**

Run from the repository root:

```bat
git add dsh-desktop\assets\plugins\dsh-dream-skin dsh-desktop\main.js dsh-desktop\scripts\onboarding.js dsh-desktop\test\dream-skin-builtin.test.mjs
git commit -m feat:dream-skin-built-in
```

Expected: one commit containing only the vendored plugin, registration, onboarding default, and integration test.

### Task 4: Full verification and handoff

**Files:**
- Verify: `dsh-desktop/assets/plugins/dsh-dream-skin/**`
- Verify: `dsh-desktop/main.js`
- Verify: `dsh-desktop/scripts/onboarding.js`
- Verify: `dsh-desktop/electron-builder.yml`
- Verify: `dsh-desktop/test/dream-skin-builtin.test.mjs`

- [ ] **Step 1: Run the complete project test suite**

Run from `dsh-desktop/`:

```bat
npm test
```

Expected: the full `node --test test/*.test.mjs` suite passes with zero failed tests.

- [ ] **Step 2: Confirm the vendored scope and network boundary**

Run from the repository root:

```bat
git show --stat --oneline HEAD
git show --name-only --format= HEAD
git diff HEAD~1 --unified=0 -- dsh-desktop\main.js dsh-desktop\scripts\onboarding.js dsh-desktop\assets\plugins\dsh-dream-skin\lib\client.js dsh-desktop\test\dream-skin-builtin.test.mjs | rg "^\+.*(fetch\(|https\.request|pluginUpdateSources|PLUGIN_UPDATE|fonts\.(googleapis|gstatic)\.com)"
```

Expected: changed implementation files match the file map. The final pipeline prints no added network-call, updater-source, or Google Fonts domain lines and exits with ripgrep's no-match status 1. Separately review the vendored-client source diff to confirm its only divergence is deletion of the remote font `@import`.

- [ ] **Step 3: Inspect the final diff and worktree**

Run:

```bat
git status --short
git log -3 --oneline
git diff HEAD~1 --check
```

Expected: the worktree is clean, the implementation commit follows the two design commits, and the final diff has no whitespace errors.

- [ ] **Step 4: Report the verified result**

Report the plugin version and source, the built-in/default-enabled behavior, focused and full test results, the implementation commit, and any verification limitation. Do not claim UI behavior was manually observed unless an actual desktop launch was performed.
