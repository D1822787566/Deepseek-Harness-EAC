# Desktop Startup Isolation Fix Design

## Problem

Fresh `DSH_HOME` startup fails because `ensureDesktopProfileInit()` references an undeclared `home` variable before creating the shared `schemastery` junction. The resulting missing dependency prevents `dsh-better-sidebar` and `@dsh-external/dsh-side-session` from loading and terminates `dsh web` with exit code 1.

Development isolation is also applied too late. `DSH_DESKTOP_USERDATA` is processed inside `boot()`, after Electron has acquired the single-instance lock, so an installed app and a development app can still contend for the default Electron instance scope.

## Considered Approaches

1. Manually install `schemastery` into each temporary profile. This treats a generated profile as user-managed state and fails again for every fresh home.
2. Disable the two plugins that expose the missing dependency. This hides the initialization bug and removes expected functionality.
3. Repair profile initialization and apply Electron userData before the single-instance lock. This fixes the source of both failures and is the selected approach.

## Design

Resolve the effective DSH home at the beginning of `ensureDesktopProfileInit()` using the existing portable expression: explicit `dshHome`, otherwise `os.homedir()/.dsh`. Use that value for both the desktop profile directory and the shared `profiles/node_modules` directory. Keep the existing idempotent junction behavior and error logging.

Move the existing userData selection logic out of `boot()` and execute it before `app.requestSingleInstanceLock()`. Development builds honor `DSH_DESKTOP_USERDATA`; portable builds continue to use `<portable executable directory>/data`; normal installed builds retain Electron's default userData path.

No machine-specific absolute paths are introduced. `schemastery` remains sourced from `__dirname/node_modules/schemastery`, which is already a declared dependency and is explicitly retained by `scripts/after-pack.js`.

## Error Handling

If the bundled `schemastery` source is absent, initialization keeps its current safe skip behavior. If junction creation fails, the existing boot log records the OS error. Repeated initialization remains idempotent.

## Testing

- Add a focused integration test that verifies profile initialization resolves home before creating the shared junction.
- Add a lifecycle-order test that verifies userData selection appears before the single-instance lock and is no longer performed inside `boot()`.
- Run syntax checks and the full unit suite.
- Launch against a fresh isolated `DSH_HOME` and `DSH_DESKTOP_USERDATA`; require the junction to exist and `dsh web` to report readiness without `home is not defined` or `ERR_MODULE_NOT_FOUND`.

## Compatibility

The fix targets Windows, matching the current embedded `node.exe` runtime and junction-based profile closure. Installed, portable, and source-development modes preserve their existing path policies while using paths resolved on each machine.
