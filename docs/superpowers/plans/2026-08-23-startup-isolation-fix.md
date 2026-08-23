# Desktop Startup Isolation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a fresh isolated desktop profile boot successfully and scope Electron userData before the single-instance lock.

**Architecture:** Keep the fix in the existing Electron lifecycle and profile initializer. Add a source-level integration regression test because `main.js` is an Electron entry with process side effects, then prove the end-to-end behavior with a fresh temporary home.

**Tech Stack:** Electron 43, CommonJS, Node.js test runner, Windows directory junctions.

---

### Task 1: Add startup isolation regression coverage

**Files:**
- Create: `dsh-desktop/test/startup-isolation.test.mjs`
- Inspect: `dsh-desktop/main.js:179-214`
- Inspect: `dsh-desktop/main.js:4929-4935`
- Inspect: `dsh-desktop/main.js:5065-5120`

- [ ] **Step 1: Write the failing tests**

Read `main.js`, extract `ensureDesktopProfileInit()`, and assert that it resolves `home` before using it for `profiles/node_modules`. Also assert that the `DSH_DESKTOP_USERDATA` call to `app.setPath('userData', ...)` occurs before `app.requestSingleInstanceLock()` and does not remain inside `boot()`.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test test/startup-isolation.test.mjs`

Expected: FAIL because `home` is undeclared in the initializer and userData selection occurs after the single-instance lock.

- [ ] **Step 3: Commit the failing regression test**

Run:

```text
git add dsh-desktop/test/startup-isolation.test.mjs
git commit -m test-startup-isolation-regression
```

### Task 2: Implement the minimal startup fix

**Files:**
- Modify: `dsh-desktop/main.js:179-214`
- Modify: `dsh-desktop/main.js:4929-4935`
- Modify: `dsh-desktop/main.js:5065-5120`
- Test: `dsh-desktop/test/startup-isolation.test.mjs`

- [ ] **Step 1: Resolve DSH home in profile initialization**

Add the existing platform-neutral resolution at the top of `ensureDesktopProfileInit()`:

```js
const home = dshHome || path.join(os.homedir(), '.dsh');
```

Keep the existing profile file creation and idempotent `schemastery` junction logic unchanged.

- [ ] **Step 2: Move Electron userData selection before the lock**

Move the existing development/portable `app.setPath('userData', ...)` branch immediately above `app.requestSingleInstanceLock()`. Remove the branch from `boot()` so it executes exactly once and before Electron instance scoping.

- [ ] **Step 3: Run syntax and focused tests to verify GREEN**

Run:

```text
node --check main.js
node --test test/startup-isolation.test.mjs
```

Expected: both commands exit 0 and both regression assertions pass.

- [ ] **Step 4: Commit the implementation**

Run:

```text
git add dsh-desktop/main.js
git commit -m fix-startup-isolation
```

### Task 3: Verify fresh isolated startup and full regression suite

**Files:**
- Verify: `dsh-desktop/main.js`
- Verify: `dsh-desktop/test/startup-isolation.test.mjs`

- [ ] **Step 1: Run the full unit suite**

Run: `npm.cmd test`

Expected: 0 failures.

- [ ] **Step 2: Launch with a fresh temporary root**

Set `DSH_HOME`, `DSH_DESKTOP_USERDATA`, all three update skip flags, and debug logging to a new directory. Start `npm.cmd start`, complete or bypass first-run onboarding, and wait for `dsh web` readiness.

- [ ] **Step 3: Verify runtime artifacts and logs**

Require all of the following:

- `<DSH_HOME>/profiles/node_modules/schemastery` exists.
- `desktop.log` contains `Web UI 就绪`.
- Neither log contains `home is not defined`.
- `dsh-web.log` does not contain `ERR_MODULE_NOT_FOUND` for `schemastery`.
- The boot line reports the requested isolated userData and DSH home.

- [ ] **Step 4: Review, merge, and push**

Review the complete diff, merge `fix/startup-isolation` into `main`, rerun the focused test on the merged result, and push `main` to `origin`.
