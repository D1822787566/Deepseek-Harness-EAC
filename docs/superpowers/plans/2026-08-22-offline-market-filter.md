# Offline-Only Market Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an “仅看离线包 / Offline only” toggle that composes with every existing plugin-market filter.

**Architecture:** Keep the host API and manifest untouched. Extract the browser bundle’s filtering into a small pure core exposed through `window.__dshMarketFilterCore`, test it directly with Node’s VM runner, and have the existing React panel consume it.

**Tech Stack:** Classic browser JavaScript bundle, React 18 hooks, Node.js `node:test`, `node:vm`.

---

## File map

- Modify `dsh-desktop/assets/plugins/dsh-webui-market/lib/client.js`: expose pure filtering helpers, add toggle state/count/button, and route the current filter pipeline through the helper.
- Create `dsh-desktop/test/market-filter-core.test.mjs`: execute the real browser bundle in a VM and verify filtering, count, and labels.

### Task 1: Add the pure filter-core regression tests

**Files:**
- Create: `dsh-desktop/test/market-filter-core.test.mjs`
- Test: `dsh-desktop/test/market-filter-core.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const BUNDLE = new URL('../assets/plugins/dsh-webui-market/lib/client.js', import.meta.url)

function loadCore() {
  const src = readFileSync(BUNDLE, 'utf8')
  const win = { __ModuleLoader__: { load: () => {} } }
  vm.runInNewContext(src, { window: win, console })
  assert.ok(win.__dshMarketFilterCore, 'bundle must expose the pure filter core')
  return win.__dshMarketFilterCore
}

const core = loadCore()
const PLUGINS = [
  { name: 'Offline Tool', desc: 'local utility', by: 'alice', cat: 'tools', offline: true },
  { name: 'Online Tool', desc: 'remote utility', by: 'bob', cat: 'tools' },
  { name: 'Offline Theme', desc: 'dark skin', by: 'carol', cat: 'themes', offline: true },
  { name: 'Hidden Lab', desc: 'unsafe experiment', by: 'dave', cat: 'tools', offline: true, experimental: true },
]

test('default filtering keeps online and offline non-experimental plugins', () => {
  const out = core.filterPlugins(PLUGINS, { cat: 'all' })
  assert.deepEqual(Array.from(out, (p) => p.name), ['Offline Tool', 'Online Tool', 'Offline Theme'])
})

test('offline-only filtering keeps exactly entries stamped offline', () => {
  const out = core.filterPlugins(PLUGINS, { cat: 'all', showOffline: true })
  assert.deepEqual(Array.from(out, (p) => p.name), ['Offline Tool', 'Offline Theme'])
})

test('offline-only composes with category, search, installed and experimental filters', () => {
  const installed = new Set(['Offline Tool', 'Hidden Lab'])
  const out = core.filterPlugins(PLUGINS, {
    cat: 'tools', query: 'lab', showOffline: true, showInstalled: true, showExperimental: true,
    isInstalled: (p) => installed.has(p.name),
  })
  assert.deepEqual(Array.from(out, (p) => p.name), ['Hidden Lab'])
})

test('offline count uses the complete catalog', () => {
  assert.equal(core.countOffline(PLUGINS), 3)
  assert.equal(core.countOffline(core.filterPlugins(PLUGINS, { cat: 'themes' })), 1)
})

test('bundle contains the localized offline-only button labels', () => {
  const src = readFileSync(BUNDLE, 'utf8')
  assert.match(src, /仅看离线包/)
  assert.match(src, /Offline only/)
})
```

- [ ] **Step 2: Run the test to verify RED**

Run from `dsh-desktop`:

```powershell
node --test test/market-filter-core.test.mjs
```

Expected: FAIL at `bundle must expose the pure filter core`, because the core does not exist yet.

- [ ] **Step 3: Commit the red test**

```powershell
git add -- dsh-desktop/test/market-filter-core.test.mjs
git commit -m "test(market): cover offline-only filtering"
```

### Task 2: Implement the offline-only filter and button

**Files:**
- Modify: `dsh-desktop/assets/plugins/dsh-webui-market/lib/client.js:1-10`
- Modify: `dsh-desktop/assets/plugins/dsh-webui-market/lib/client.js:238-248`
- Modify: `dsh-desktop/assets/plugins/dsh-webui-market/lib/client.js:414-430`
- Modify: `dsh-desktop/assets/plugins/dsh-webui-market/lib/client.js:548-570`
- Test: `dsh-desktop/test/market-filter-core.test.mjs`

- [ ] **Step 1: Add the minimal pure filter core**

Insert before `window.__ModuleLoader__.load(...)`:

```js
function filterMarketPlugins(plugins, options) {
  const opts = options || {}
  const cat = opts.cat || 'all'
  const q = String(opts.query || '').trim().toLowerCase()
  return (plugins || []).filter((p) => {
    if (cat !== 'all' && p.cat !== cat) return false
    if (p.experimental && !opts.showExperimental) return false
    if (opts.showInstalled && !(typeof opts.isInstalled === 'function' && opts.isInstalled(p))) return false
    if (opts.showOffline && p.offline !== true) return false
    if (q && !((p.name || '').toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) || (p.by || '').toLowerCase().includes(q))) return false
    return true
  })
}

function countOfflineMarketPlugins(plugins) {
  return (plugins || []).filter((p) => p.offline === true).length
}

window.__dshMarketFilterCore = {
  filterPlugins: filterMarketPlugins,
  countOffline: countOfflineMarketPlugins,
}
```

- [ ] **Step 2: Add state and localized labels**

Add next to `showInstalled`:

```js
const [showOffline, setShowOffline] = useState(false)
```

Add `offlineFilter: '仅看离线包'` to the Chinese strings and `offlineFilter: 'Offline only'` to the English strings.

- [ ] **Step 3: Route filtering through the tested helper**

Replace the inline `filtered` block and retain `installedCount`:

```js
const filtered = filterMarketPlugins(data.plugins, {
  cat, query, showExperimental, showInstalled, showOffline,
  isInstalled: (p) => isInstalled(p, data.installed),
})

const installedCount = (data.plugins || []).filter((p) => isInstalled(p, data.installed)).length
const offlineCount = countOfflineMarketPlugins(data.plugins)
```

- [ ] **Step 4: Render the toggle beside “已安装”**

Immediately after the existing installed-filter button, add:

```js
h('button', {
  className: 'mkts-chip' + (showOffline ? ' mkts-chip-on' : ''),
  onClick: () => setShowOffline(!showOffline),
}, t('offlineFilter'), ' ', h('small', null, offlineCount)),
```

The handler must not mutate category, search, sorting, installed filtering, or experimental visibility.

- [ ] **Step 5: Run the focused test to verify GREEN**

```powershell
node --test test/market-filter-core.test.mjs
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 6: Run syntax validation**

```powershell
node --check assets/plugins/dsh-webui-market/lib/client.js
```

Expected: exit code 0 with no output.

- [ ] **Step 7: Commit the implementation**

```powershell
git add -- dsh-desktop/assets/plugins/dsh-webui-market/lib/client.js
git commit -m "feat(market): add offline-only filter"
```

### Task 3: Verify the integrated project

**Files:**
- Verify: `dsh-desktop/assets/plugins/dsh-webui-market/lib/client.js`
- Verify: `dsh-desktop/test/market-filter-core.test.mjs`

- [ ] **Step 1: Run market-focused tests**

```powershell
node --test test/market-filter-core.test.mjs test/market-offline.test.mjs test/market-installed.test.mjs
```

Expected: all selected tests pass with 0 failures.

- [ ] **Step 2: Run the full suite**

```powershell
npm.cmd test
```

Expected: all project tests pass with 0 failures.

- [ ] **Step 3: Check the final diff and working tree**

Run from the repository root:

```powershell
git diff --check HEAD~2..HEAD
git status --short
```

Expected: no whitespace errors and no uncommitted implementation changes.
