<p align="center">
  <a href="./README.md">中文</a> · <strong>English</strong>
</p>

<div align="center">

# dsh-dream-skin 🔮

**Give DeepSeek Harness a face that breathes, feels, and belongs to you.**

Native skinning · wallpaper · shareable theme packs — a romance-engineered project built entirely on DSH's official `--dsw-*` token system.

> **TL;DR: code with atmosphere.** ✨

| 🎨 8 original themes | 🖼️ wallpaper + opacity/blur | 🌈 one-click accent | 📦 shareable theme packs |
|---|---|---|---|

> 3-line install · purely native (no injection, no installer patches) · survives DSH updates

[中文](./README.md) · [Changelog](./CHANGELOG.md) · [Project Notes](./docs/PROJECT.md) · [Publishing Guide](./docs/publishing-to-npm.md)

![npm version](https://img.shields.io/npm/v/dsh-dream-skin?color=4f83f2&label=npm)
![license](https://img.shields.io/github/license/RevolutionLA/dsh-dream-skin?color=34d399)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
![node](https://img.shields.io/badge/node-%3E%3D18-6d9af6)
![dsh](https://img.shields.io/badge/dsh-0.1.0--rc.6-blueviolet)
![plugin type](https://img.shields.io/badge/plugin-dual--face%20(dsh.bundle%2Bdsh.client)-4f83f2)
![ci](https://img.shields.io/github/actions/workflow/status/RevolutionLA/dsh-dream-skin/ci.yml?branch=main&label=CI&color=34d399)
![code size](https://img.shields.io/github/languages/code-size/RevolutionLA/dsh-dream-skin?color=orange)

</div>

> 🚀 **Now on npm!** With DSH installed, add it in one command — no cloning needed:
> ```sh
> dsh plugin --profile web add dsh-dream-skin
> ```

> **Homage to [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).** But the approach is different:
> Codex injects CSS into the desktop client's renderer via CDP, whereas DSH is a **token-driven Web GUI** that ships
> first-class "third-party plugins registering themes". So this plugin is **purely native** — no injection, no binary
> patches, and it won't break on client updates.
>
> **Not an official product.** Just a way to dress up your DeepSeek Harness workspace.

---

## 📸 Screenshots

> Real screenshots, not mockups. Left: DSH after applying a skin; right: the dedicated **Theme / Appearance** section in Settings.

<p align="center">
  <img src="docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🏆 Why it earns a star (vs alternatives)

| Capability | Ours | Other DSH skinning | Codex-Dream-Skin (desktop) |
|------|:---:|:---:|:---:|
| Native token themes — no injection, no installer patches | ✅ | ✅ | ❌ (CDP injection) |
| Custom wallpaper + opacity/blur | ✅ | partial | ✅ |
| **Theme-pack import/export + share links** | ✅ | ❌ | ✅ (zip packs) |
| **Per-user Accent override** | ✅ | ❌ | partial |
| **Wallpaper 2.0 (URL / video / gradient / per-skin suggestion / auto-dim)** | ✅ | ❌ | ✅ |
| Local pack library + favorites + surprise-me | ✅ | ❌ | partial |
| Validation + rollback | ✅ | partial | ✅ |
| **Browser Web GUI, cross-platform natively** | ✅ | ✅ | ❌ (needs desktop App) |

## ✨ Features

| Capability | Description |
|------------|-------------|
| 🎨 **8 bundled presets (Mirage)** | Switch instantly under **Settings → Theme / Appearance**, light & dark |
| 🖼️ **Custom wallpaper** | Pick a local image (auto-compressed ≤2MB), tune **opacity / blur** |
| 📐 **Independent sidebar opacity** | Separate sliders for the **left** sidebar (app nav) and the **right** sidebar (dsh-better-sidebar workbench panels) |
| 🔤 **Opaque inner surfaces** | Cards, inputs, message bubbles stay readable — never washed out |
| ↩️ **Default restore** | Back to DSH's built-in appearance (follow system) in one click |
| 💾 **Local persistence** | Skin & wallpaper stored in `localStorage`, survives reload |

## 🚀 Advanced capabilities (P0)

Differentiation inspired by existing DSH skin projects plus Codex's skin UX:

| Capability | Description |
|------------|-------------|
| 📦 **Theme-pack format + import/export** | A `*.dsh-theme.json` pack = format marker + version + manifest (id/name/author/scheme/accent/tokens). Import a file, one-click apply, and copy a **share link** (encoded in the URL hash) |
| 🌈 **Per-user Accent** | Stack a custom brand-accent over the active skin (`overrideTokens` layer, the skin untouched): **12 one-click preset swatches**, a color picker, **randomize**, and clear |
| 🖼️ **Wallpaper 2.0** | Local image / **image URL** / **video wallpaper** (direct URL or a local file persisted in IndexedDB) / **gradient presets**, with a **per-skin suggested gradient** and **auto-dim**; **Recent** (up to 5) to switch back in one click |
| 🧩 **Local pack library** | Your imported theme packs in one place; **apply / favorite / remove** in a click (the 8 built-in skins live in the Skins row) |
| ✅ **Clear selection feedback** | Switching skins updates the checked/bordered highlight **instantly** — no stale white highlight box |
| 🎲 **Surprise me** | Randomly switch to a theme different from the current one |
| ⭐ **Favorites** | Star your favorite skins and switch between them fast |
| ✅ **Validation + rollback** | Pack import validates format / required tokens / color legality; failures or removals fall back safely |

## ⚡ Quick start (3 steps)

```sh
# 1. install
dsh plugin --profile web add dsh-dream-skin
# 2. restart
dsh web
# 3. open Settings → Theme / Appearance → pick a skin → done.
```

> Installs the published npm package — no cloning. If `dsh plugin add` reports a workspace error, append `-w`.

## 🧩 What kind of plugin is this

**A standard dual-face "everything-is-a-plugin" `dsh-plugin` — loaded and used exactly like the official `ui-theme` package.**

DeepSeek Harness's motto is *everything is a plugin*: models, tools, sandboxes, sessions, UI, even the Agent Loop
itself are plugins. `dsh-dream-skin` ships skinning as an npm package that is **isomorphic with the official UI
packages**:

```text
            ┌──────────── dsh-dream-skin (standard dsh-plugin / dual-face) ─────────────┐
            │  dsh.bundle   → cordis.patch.yml inserts the dream-skin entry  (host half)│
            │  dsh.client   → lib/client.js (browser bundle)                (browser half)│
            └───────────────────────────────────────────────────────────────────────────┘
```

- **Install command = the official one**: `dsh plugin --profile web add dsh-dream-skin`
- **Uses official extension points**: `ctx.theme` (register themes), `ctx.theme.overrideTokens` (override layers),
  `ctx.slots` (mount UI into a dedicated **Settings → Theme / Appearance** section).
- **Manifest contract matches official packages**: `dsh.bundle` + `dsh.client` + `exports["./client"]`.

In other words: you are not installing a fringe script — this is a standard skin plugin inside DSH's official plugin
system.

## 🖼️ Preview — the Mirage series

> Previews below are generated from each skin's **real tokens** — what you see is what you get.

<table>
  <tr>
    <td align="center"><img src="docs/previews/abyss.svg" width="220" alt="abyss"/><br/><b>abyss</b></td>
    <td align="center"><img src="docs/previews/aurora.svg" width="220" alt="aurora"/><br/><b>aurora</b></td>
    <td align="center"><img src="docs/previews/nebula.svg" width="220" alt="nebula"/><br/><b>nebula</b></td>
    <td align="center"><img src="docs/previews/ember.svg" width="220" alt="ember"/><br/><b>ember</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/previews/midnight.svg" width="220" alt="midnight"/><br/><b>midnight</b></td>
    <td align="center"><img src="docs/previews/ivory.svg" width="220" alt="ivory"/><br/><b>ivory</b></td>
    <td align="center"><img src="docs/previews/mist.svg" width="220" alt="mist"/><br/><b>mist</b></td>
    <td align="center"><img src="docs/previews/rose.svg" width="220" alt="rose"/><br/><b>rose</b></td>
  </tr>
</table>

## 🎲 The presets

| id | scheme | vibe |
|------|--------|------|
| `abyss` | 🕶️ dark | DeepSeek deep-blue abyss (anchor) |
| `aurora` | 🌌 dark | aurora teal-green |
| `nebula` | 🪐 dark | cosmic purple |
| `ember` | 🔥 dark | warm ember orange |
| `midnight` | 🌚 dark | pure-black OLED |
| `ivory` | 📜 light | warm ivory / paper |
| `mist` | 🌫️ light | cool blue fog |
| `rose` | 🌸 light | rose pink / blush |

## 📦 Install

### Option A: From npm (published, **recommended**)

```sh
dsh plugin --profile web add dsh-dream-skin
```

Then **restart** the web server:

```sh
# stop the running instance, then:
dsh web
```

Open **Settings → Theme / Appearance** to see the **Skins**, **Accent**, **Wallpaper** / **Advanced Wallpaper**, and **Theme Packs** rows.

> The `-w` (workspace) flag is needed on a bare `add` because every profile ships a `pnpm-workspace.yaml`; pnpm treats
> the profile directory as a workspace root, so a bare add fails with `ERR_PNPM_ADDING_TO_ROOT`. If your profile already
> uses the workspace, you won't need to repeat it.

### Option B: From source / a local directory (developers)

```sh
dsh plugin --profile web add -w /path/to/dsh-dream-skin
```

## 🔄 Update / Uninstall

**Update to the latest** (when installed from the npm release):

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # restart to pick it up
```

> Stuck on an old version after an update? pnpm's minimum-release-age (supply-chain) policy can hold back a
> freshly published release. In the profile dir run:
> `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0` to force it.

**Uninstall:**

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # restores the official appearance
```

## 🧩 Compatibility

| Item | Value |
|------|-------|
| DeepSeek Harness (`dsh`) | `0.1.0-rc.6` (peerDependencies pinned to `^0.1.0-rc.6`) |
| Node.js | `>=18` |
| Browser | modern Chromium / WebKit (native CSS variables & `matchMedia`) |

> When upgrading DSH, bump the peerDependencies in `package.json` accordingly.

## ⚙️ How it works

DSH's theme system is token-based: the web shell ships `--dsw-*` design tokens, and `ThemeRuntime` lets third-party
plugins register themes that override the alias layer (`--dsw-alias-*`). This package is a standard dual-face plugin:

```text
                ┌─────────────────────────────────────────────┐
                │          dsh-dream-skin (dual-face plugin)    │
                ├────────────────────────────┬────────────────┤
    Host half   │  lib/index.js              │  Browser half  │
                │  cordis.patch.yml inserts  │  lib/client.js │
                │  dream-skin loader entry   │  __ModuleLoader__│
                └────────────────────────────┴────────────────┘
                             │                         │
                     profile tree loaded      /plugins/dsh-dream-skin/client.js
                                                         │
        ┌────────────────────────────────┬────────────────┐
        │                                │                │
   ctx.theme.register(8 skins)     ctx.theme.overrideTokens(wallpaper)   ctx.slots.inject('settings.general.item')
```

- **Host half** (`lib/index.js`) — a `dsh.bundle` patch layer inserting the `dream-skin` loader entry; `apply` is a
  no-op, exactly like the shipped `ui-*` packages.
- **Browser half** (`lib/client.js`):
  1. registers the 8 skins via `ctx.theme.register(...)`;
  2. restores the saved skin and applies it with `ctx.theme.setTheme(...)`;
  3. renders the wallpaper as a `z-index:-1` fixed backdrop and stacks `ctx.theme.overrideTokens(...)` making the
     main canvas (`--dsw-alias-bg-base`) and sidebar (`--dsw-specific-sidebar-fill`) translucent;
  4. listens for `theme/change` and re-shades the wallpaper wash on skin / scheme switch;
  5. mounts both rows into the `settings.general.item` slot.

Each skin carries its `colorScheme` (`light`/`dark`), driving `body[data-ds-dark-theme]`; the alias-token overrides
are applied as inline custom properties on `<body>` by ui-layout's ThemePresenter.

## 💼 Persistence notes

- Skin & wallpaper are stored in `localStorage` (keys prefixed `dsh-dream-skin:`), **per browser**.
- Why not Host settings? The Host settings wire only exposes an allowlisted set of namespaces to browser clients
  (`WEB_SETTINGS_NAMESPACES` in `dsh-host-apiproxy`), so a third-party namespace would answer `settings-not-exposed`;
  the product itself keeps remote browser preferences process-local. `localStorage` matches that boundary and
  survives reloads.

## 🛠️ Development / extending themes

The client bundle is written directly in the `__ModuleLoader__` format (the same shape tsdown emits for the shipped
`ui-*` packages), so **no build step** is required. `lib/client.js` may `require` only module-table entities: platform
seeds (`react`, `react/jsx-runtime`, …) and registered client bundles (`@deepseek-ai/dsh-client-runtime/client`, …).

- **Add a built-in skin**: append an object (`id` + `colorScheme` + `tokens`) to the `SKINS` array in `lib/client.js`;
  it then appears in Settings automatically. Add a `skin.<id>` key to both the `zh` and `en` dictionaries.
- **Ship a theme pack (recommended)**: follow [`docs/examples/sample-theme-pack.json`](./docs/examples/sample-theme-pack.json) —
  one `*.dsh-theme.json` is importable in Settings and shareable via a link, no code changes needed.
- **Add your own wallpapers**: drop images into [`wallpapers/`](./wallpapers/) (distribute only what you have rights
  to), then import them via DSH's "Wallpaper" row.
- **Validate**: `npm test` (VM smoke tests covering factory eval, `apply()`, and pack import/persistence).
- **Repaint**: reference the `--dsw-alias-*` tokens (full contract in [`docs/themes-spec.md`](./docs/themes-spec.md)).

## 📌 Roadmap

- [x] v0.1: 8 themes + custom wallpaper (opacity / blur) + local persistence
- [x] Theme-pack format + import / export / share link (JSON + manifest + validation)
- [x] Per-user Accent + randomize
- [x] Wallpaper 2.0 (URL / video / gradient / per-skin suggestion / auto-dim)
- [x] Local pack library + one-click apply / favorites / surprise-me
- [ ] Online palette / theme-preview Studio (pure frontend, contrast checker)
- [ ] Community theme gallery (submit packs to the repo / online gallery)
- [ ] Full i18n copy & docs (zh / en / more)
- [ ] First-paint (FOUC) improvement

## 🤝 Contributing

Issues and PRs welcome! Please read the [Contributing Guide](./CONTRIBUTING.md) and follow the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## ⭐ Support the project

If you like it: star **⭐** the repo, thumbs-up **👍** on npm, or share it with DSH friends — it helps the project
get discovered and keeps it maintained. Want to contribute themes / an online Studio / more skins? Join in.

## 🔒 Security

Found a security issue? Don't open a public issue — see the [Security Policy](./SECURITY.md).

## 📄 License

[MIT](./LICENSE)

## 🙏 Acknowledgments

- Architecture & API reference: the official DeepSeek Harness
  [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) client package.
- Concept homage: [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).
