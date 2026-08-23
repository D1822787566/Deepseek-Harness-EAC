// dsh-dream-skin — browser half (client plugin bundle).
//
// Loaded by dsh-client-modules at /plugins/dsh-dream-skin/client.js and
// executed through the vendored cordis Loader's lazy-CJS module table
// (window.__ModuleLoader__.load). The factory body is plain CJS with
// require() resolved against the shell's module table — the same shape the
// shipped ui-* packages' tsdown bundles emit. Only platform seed words and
// registered client bundles may be required.
//
// Persistence note: the skin choice and wallpaper settings are stored in
// localStorage. DSH's Host settings wire only exposes an allowlisted set of
// namespaces to browser clients (dsh-host-apiproxy's WEB_SETTINGS_NAMESPACES),
// so a third-party namespace would answer `settings-not-exposed`; the product
// itself keeps remote browser preferences process-local, and localStorage
// matches that boundary for visual preferences while surviving reloads on the
// same origin.

window.__ModuleLoader__.load({
	id: "dsh-dream-skin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _react = require("react");
		let _runtime_client = require("@deepseek-ai/dsh-client-runtime/client");

		//#region dsh-dream-skin: constants & presets
		/** The settings row's locale namespace. */
		const SETTINGS_NS = "settings.dreamSkin";
		/** localStorage key holding the selected skin id. */
		const STORAGE_KEY = "dsh-dream-skin:skin";
		/** localStorage key holding the wallpaper image (data URL). */
		const WALLPAPER_KEY = "dsh-dream-skin:wallpaper";
		/** localStorage key holding the wallpaper wash opacity (0..1). */
		const WALLPAPER_OPACITY_KEY = "dsh-dream-skin:wallpaper-opacity";
		/** localStorage key holding the wallpaper blur radius (px). */
		const WALLPAPER_BLUR_KEY = "dsh-dream-skin:wallpaper-blur";
		/** localStorage key holding recent wallpaper history (JSON array of {kind,value}). */
		const WALLPAPER_HISTORY_KEY = "dsh-dream-skin:wallpaper-history";
		/** Max wallpaper history entries kept. */
		const WALLPAPER_HISTORY_MAX = 5;
		/** Sentinel meaning "no custom skin — follow the built-in appearance". */
		const DEFAULT_SKIN = "system";
		/** Default wash opacity (0..1) applied to the translucent surfaces. */
		const DEFAULT_WALLPAPER_OPACITY = 0.8;
		/** Default wallpaper blur radius in px. */
		const DEFAULT_WALLPAPER_BLUR = 0;
		/** localStorage key holding the sidebar wash opacity (0..1). */
		const SIDEBAR_OPACITY_KEY = "dsh-dream-skin:sidebar-opacity";
		/** Default sidebar wash opacity (0..1) - solid by default for layering. */
		const DEFAULT_SIDEBAR_OPACITY = 1;
		/** localStorage key holding the right-sidebar (dsh-better-sidebar) wash opacity (0..1). */
		const RIGHT_SIDEBAR_OPACITY_KEY = "dsh-dream-skin:right-sidebar-opacity";
		/** Default right-sidebar wash opacity (0..1) - solid by default, like the left sidebar. */
		const DEFAULT_RIGHT_SIDEBAR_OPACITY = 1;
		/** CSS custom property consumed by dsh-better-sidebar's panel surfaces
		 *  (the plugin falls back to --dsw-alias-bg-layer-1 when it is unset). */
		const RIGHT_SIDEBAR_FILL_TOKEN = "--dsw-better-sidebar-fill";
		/** Injected stylesheet completing the right-sidebar wash contract.
		 *  The better-sidebar host carries `data-dsh-better-sidebar` and its
		 *  panel surfaces are painted with var(--dsw-alias-bg-layer-1); the
		 *  plugin does not itself consume --dsw-better-sidebar-fill, so this
		 *  rule re-points the layer-1 token INSIDE the host to a literal fill
		 *  (layer-1 RGB at the user's right-sidebar opacity). The tag text is
		 *  rebuilt on every re-shade (slider move / skin switch / scheme flip)
		 *  and removed on teardown, so it never outlives the wallpaper layer. */
		let rightSidebarWashEl = null;
		function renderRightSidebarWash(ctx) {
			const snapshot = ctx.theme.getTheme();
			const active = snapshot.active;
			const fill = toRgba(resolveLayer1(active.colorScheme, active), readRightSidebarOpacity());
			const css = "[data-dsh-better-sidebar]{--dsw-alias-bg-layer-1:" + fill + "}";
			if (rightSidebarWashEl === null || !document.head.contains(rightSidebarWashEl)) {
				rightSidebarWashEl = document.createElement("style");
				rightSidebarWashEl.dataset.plugin = "dsh-dream-skin";
				rightSidebarWashEl.dataset.pluginCss = "dsh-dream-skin/right-sidebar-wash";
				document.head.appendChild(rightSidebarWashEl);
			}
			rightSidebarWashEl.textContent = css;
		}
		/** Remove the right-sidebar wash stylesheet (wallpaper cleared / fiber unload). */
		function removeRightSidebarWash() {
			rightSidebarWashEl?.remove();
			rightSidebarWashEl = null;
		}
		/** Built-in base colors used when no skin token owns a scheme. */
		const BUILTIN_BASE = {
			light: "rgb(255, 255, 255)",
			dark: "rgb(21, 21, 23)"
		};

		/**
		 * The curated "Mirage" skin catalog. Every skin is a third-party theme
		 * for the built-in ThemeRuntime: an id, the base palette it builds on
		 * (colorScheme drives body[data-ds-dark-theme]), and --dsw-alias-*
		 * overrides applied as inline custom properties on <body> by ui-layout's
		 * ThemePresenter. Values are concrete CSS colors (no var() indirection),
		 * tuned per skin for contrast on both surface and text roles. Add your
		 * own entries here and they appear in the Settings picker automatically.
		 */
		const SKINS = [
			{
				id: "abyss",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#060a14",
					"--dsw-alias-bg-layer-1": "#0d1424",
					"--dsw-alias-bg-layer-2": "#141e36",
					"--dsw-alias-bg-layer-3": "#1a2744",
					"--dsw-alias-bg-overlay": "#1b2947",
					"--dsw-alias-border-l1": "rgba(148, 168, 210, 0.13)",
					"--dsw-alias-border-l2": "rgba(148, 168, 210, 0.24)",
					"--dsw-alias-label-primary": "#eef2fa",
					"--dsw-alias-label-secondary": "#9fb2d4",
					"--dsw-alias-label-tertiary": "#788eb6",
					"--dsw-alias-brand-primary": "#4f83f2",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#6f9af6",
					"--dsw-alias-button-primary-dimmed": "#141e36",
					"--dsw-alias-state-business-primary": "#4f83f2",
					"--dsw-alias-state-business-tertiary": "#141e36",
					"--dsw-alias-interactive-bg-hover": "rgba(79, 131, 242, 0.13)",
					"--dsw-alias-interactive-bg-active": "rgba(79, 131, 242, 0.22)",
					"--dsw-alias-markdown-code-block": "#0b1120",
					"--dsw-alias-markdown-inline-code": "#141e36",
					"--dsw-specific-sidebar-fill": "#0b1120",
					"--dsw-specific-sidebar-nav-item-active": "#141e36",
					"--dsw-specific-sidebar-nav-item-hover": "#101828",
					"--dsw-alias-scrollbar-bg-l1": "#1a2744",
					"--dsw-alias-scrollbar-bg-l2": "#1f2f52",
					"--dsw-alias-scrollbar-hover-l1": "#26375f",
					"--dsw-alias-scrollbar-hover-l2": "#26375f"
				}
			},
			{
				id: "aurora",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#04120f",
					"--dsw-alias-bg-layer-1": "#0a1d18",
					"--dsw-alias-bg-layer-2": "#102a23",
					"--dsw-alias-bg-layer-3": "#16372e",
					"--dsw-alias-bg-overlay": "#183a31",
					"--dsw-alias-border-l1": "rgba(110, 231, 183, 0.12)",
					"--dsw-alias-border-l2": "rgba(110, 231, 183, 0.22)",
					"--dsw-alias-label-primary": "#eafaf2",
					"--dsw-alias-label-secondary": "#92d5b8",
					"--dsw-alias-label-tertiary": "#6fb398",
					"--dsw-alias-brand-primary": "#34d399",
					"--dsw-alias-brand-text": "#03211a",
					"--dsw-alias-button-primary-hover": "#57e0b0",
					"--dsw-alias-button-primary-dimmed": "#102a23",
					"--dsw-alias-state-business-primary": "#34d399",
					"--dsw-alias-state-business-tertiary": "#102a23",
					"--dsw-alias-interactive-bg-hover": "rgba(52, 211, 153, 0.13)",
					"--dsw-alias-interactive-bg-active": "rgba(52, 211, 153, 0.22)",
					"--dsw-alias-markdown-code-block": "#081712",
					"--dsw-alias-markdown-inline-code": "#102a23",
					"--dsw-specific-sidebar-fill": "#081712",
					"--dsw-specific-sidebar-nav-item-active": "#102a23",
					"--dsw-specific-sidebar-nav-item-hover": "#0c231c",
					"--dsw-alias-scrollbar-bg-l1": "#16372e",
					"--dsw-alias-scrollbar-bg-l2": "#1b4438",
					"--dsw-alias-scrollbar-hover-l1": "#225344",
					"--dsw-alias-scrollbar-hover-l2": "#225344"
				}
			},
			{
				id: "nebula",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#0f0a1c",
					"--dsw-alias-bg-layer-1": "#17102b",
					"--dsw-alias-bg-layer-2": "#1f1638",
					"--dsw-alias-bg-layer-3": "#271c46",
					"--dsw-alias-bg-overlay": "#291e49",
					"--dsw-alias-border-l1": "rgba(216, 180, 254, 0.12)",
					"--dsw-alias-border-l2": "rgba(216, 180, 254, 0.22)",
					"--dsw-alias-label-primary": "#f4eefc",
					"--dsw-alias-label-secondary": "#c6aee6",
					"--dsw-alias-label-tertiary": "#a28dc7",
					"--dsw-alias-brand-primary": "#a78bfa",
					"--dsw-alias-brand-text": "#150c26",
					"--dsw-alias-button-primary-hover": "#bca7fd",
					"--dsw-alias-button-primary-dimmed": "#1f1638",
					"--dsw-alias-state-business-primary": "#a78bfa",
					"--dsw-alias-state-business-tertiary": "#1f1638",
					"--dsw-alias-interactive-bg-hover": "rgba(167, 139, 250, 0.14)",
					"--dsw-alias-interactive-bg-active": "rgba(167, 139, 250, 0.24)",
					"--dsw-alias-markdown-code-block": "#130c22",
					"--dsw-alias-markdown-inline-code": "#1f1638",
					"--dsw-specific-sidebar-fill": "#130c22",
					"--dsw-specific-sidebar-nav-item-active": "#1f1638",
					"--dsw-specific-sidebar-nav-item-hover": "#191230",
					"--dsw-alias-scrollbar-bg-l1": "#271c46",
					"--dsw-alias-scrollbar-bg-l2": "#312356",
					"--dsw-alias-scrollbar-hover-l1": "#3a2c66",
					"--dsw-alias-scrollbar-hover-l2": "#3a2c66"
				}
			},
			{
				id: "ember",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#120a08",
					"--dsw-alias-bg-layer-1": "#1b120e",
					"--dsw-alias-bg-layer-2": "#241913",
					"--dsw-alias-bg-layer-3": "#2d1f18",
					"--dsw-alias-bg-overlay": "#2f211a",
					"--dsw-alias-border-l1": "rgba(253, 186, 116, 0.12)",
					"--dsw-alias-border-l2": "rgba(253, 186, 116, 0.22)",
					"--dsw-alias-label-primary": "#fdf1e7",
					"--dsw-alias-label-secondary": "#d6ab8c",
					"--dsw-alias-label-tertiary": "#b68a6c",
					"--dsw-alias-brand-primary": "#fb923c",
					"--dsw-alias-brand-text": "#24110a",
					"--dsw-alias-button-primary-hover": "#fdad6a",
					"--dsw-alias-button-primary-dimmed": "#241913",
					"--dsw-alias-state-business-primary": "#fb923c",
					"--dsw-alias-state-business-tertiary": "#241913",
					"--dsw-alias-interactive-bg-hover": "rgba(251, 146, 60, 0.14)",
					"--dsw-alias-interactive-bg-active": "rgba(251, 146, 60, 0.24)",
					"--dsw-alias-markdown-code-block": "#160e0a",
					"--dsw-alias-markdown-inline-code": "#241913",
					"--dsw-specific-sidebar-fill": "#160e0a",
					"--dsw-specific-sidebar-nav-item-active": "#241913",
					"--dsw-specific-sidebar-nav-item-hover": "#1e1510",
					"--dsw-alias-scrollbar-bg-l1": "#2d1f18",
					"--dsw-alias-scrollbar-bg-l2": "#3a281d",
					"--dsw-alias-scrollbar-hover-l1": "#473225",
					"--dsw-alias-scrollbar-hover-l2": "#473225"
				}
			},
			{
				id: "midnight",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#000000",
					"--dsw-alias-bg-layer-1": "#0b0b0f",
					"--dsw-alias-bg-layer-2": "#141419",
					"--dsw-alias-bg-layer-3": "#1c1c23",
					"--dsw-alias-bg-overlay": "#1d1d24",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.12)",
					"--dsw-alias-label-primary": "#e8e8ee",
					"--dsw-alias-label-secondary": "#9d9daa",
					"--dsw-alias-label-tertiary": "#7c7c88",
					"--dsw-alias-brand-primary": "#7c8cff",
					"--dsw-alias-brand-text": "#05050a",
					"--dsw-alias-button-primary-hover": "#9aa7ff",
					"--dsw-alias-button-primary-dimmed": "#141419",
					"--dsw-alias-state-business-primary": "#7c8cff",
					"--dsw-alias-state-business-tertiary": "#141419",
					"--dsw-alias-interactive-bg-hover": "rgba(124, 140, 255, 0.13)",
					"--dsw-alias-interactive-bg-active": "rgba(124, 140, 255, 0.22)",
					"--dsw-alias-markdown-code-block": "#08080b",
					"--dsw-alias-markdown-inline-code": "#141419",
					"--dsw-specific-sidebar-fill": "#08080b",
					"--dsw-specific-sidebar-nav-item-active": "#141419",
					"--dsw-specific-sidebar-nav-item-hover": "#0e0e13",
					"--dsw-alias-scrollbar-bg-l1": "#1c1c23",
					"--dsw-alias-scrollbar-bg-l2": "#26262f",
					"--dsw-alias-scrollbar-hover-l1": "#31313c",
					"--dsw-alias-scrollbar-hover-l2": "#31313c"
				}
			},
			{
				id: "ivory",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#f7f4ee",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#f0ead8",
					"--dsw-alias-bg-layer-3": "#e7dfcb",
					"--dsw-alias-bg-overlay": "#fffdf8",
					"--dsw-alias-border-l1": "rgba(122, 96, 44, 0.1)",
					"--dsw-alias-border-l2": "rgba(122, 96, 44, 0.18)",
					"--dsw-alias-label-primary": "#2e2920",
					"--dsw-alias-label-secondary": "#6f6656",
					"--dsw-alias-label-tertiary": "#8d8373",
					"--dsw-alias-brand-primary": "#a16207",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#c67c0f",
					"--dsw-alias-button-primary-dimmed": "#f0ead8",
					"--dsw-alias-state-business-primary": "#a16207",
					"--dsw-alias-state-business-tertiary": "#f0ead8",
					"--dsw-alias-interactive-bg-hover": "rgba(161, 98, 7, 0.08)",
					"--dsw-alias-interactive-bg-active": "rgba(161, 98, 7, 0.14)",
					"--dsw-alias-markdown-code-block": "#f0ead8",
					"--dsw-alias-markdown-inline-code": "#ece5d2",
					"--dsw-specific-sidebar-fill": "#f0ead8",
					"--dsw-specific-sidebar-nav-item-active": "#e7dfcb",
					"--dsw-specific-sidebar-nav-item-hover": "#ece4d0",
					"--dsw-alias-scrollbar-bg-l1": "#e0d6bd",
					"--dsw-alias-scrollbar-bg-l2": "#d8ccb0",
					"--dsw-alias-scrollbar-hover-l1": "#cdbfa0",
					"--dsw-alias-scrollbar-hover-l2": "#cdbfa0"
				}
			},
			{
				id: "mist",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#f0f3f7",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#e7edf4",
					"--dsw-alias-bg-layer-3": "#dbe4ee",
					"--dsw-alias-bg-overlay": "#ffffff",
					"--dsw-alias-border-l1": "rgba(51, 65, 85, 0.1)",
					"--dsw-alias-border-l2": "rgba(51, 65, 85, 0.18)",
					"--dsw-alias-label-primary": "#1e293b",
					"--dsw-alias-label-secondary": "#64748b",
					"--dsw-alias-label-tertiary": "#94a3b8",
					"--dsw-alias-brand-primary": "#2563eb",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#3b82f6",
					"--dsw-alias-button-primary-dimmed": "#e7edf4",
					"--dsw-alias-state-business-primary": "#2563eb",
					"--dsw-alias-state-business-tertiary": "#e7edf4",
					"--dsw-alias-interactive-bg-hover": "rgba(37, 99, 235, 0.08)",
					"--dsw-alias-interactive-bg-active": "rgba(37, 99, 235, 0.14)",
					"--dsw-alias-markdown-code-block": "#e7edf4",
					"--dsw-alias-markdown-inline-code": "#dbe4ee",
					"--dsw-specific-sidebar-fill": "#e7edf4",
					"--dsw-specific-sidebar-nav-item-active": "#dbe4ee",
					"--dsw-specific-sidebar-nav-item-hover": "#e2e9f2",
					"--dsw-alias-scrollbar-bg-l1": "#cbd5e1",
					"--dsw-alias-scrollbar-bg-l2": "#c1ccda",
					"--dsw-alias-scrollbar-hover-l1": "#b4c0d0",
					"--dsw-alias-scrollbar-hover-l2": "#b4c0d0"
				}
			},
			{
				id: "rose",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#fbf3f5",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#f7e4ea",
					"--dsw-alias-bg-layer-3": "#f0d2dc",
					"--dsw-alias-bg-overlay": "#fffdfd",
					"--dsw-alias-border-l1": "rgba(190, 90, 120, 0.1)",
					"--dsw-alias-border-l2": "rgba(190, 90, 120, 0.18)",
					"--dsw-alias-label-primary": "#3a2230",
					"--dsw-alias-label-secondary": "#90647a",
					"--dsw-alias-label-tertiary": "#a47d92",
					"--dsw-alias-brand-primary": "#e11d78",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#ec4a96",
					"--dsw-alias-button-primary-dimmed": "#f7e4ea",
					"--dsw-alias-state-business-primary": "#e11d78",
					"--dsw-alias-state-business-tertiary": "#f7e4ea",
					"--dsw-alias-interactive-bg-hover": "rgba(225, 29, 120, 0.08)",
					"--dsw-alias-interactive-bg-active": "rgba(225, 29, 120, 0.15)",
					"--dsw-alias-markdown-code-block": "#f7e4ea",
					"--dsw-alias-markdown-inline-code": "#f0d2dc",
					"--dsw-specific-sidebar-fill": "#f7e4ea",
					"--dsw-specific-sidebar-nav-item-active": "#f0d2dc",
					"--dsw-specific-sidebar-nav-item-hover": "#f4dae2",
					"--dsw-alias-scrollbar-bg-l1": "#eccfd9",
					"--dsw-alias-scrollbar-bg-l2": "#e5c0cd",
					"--dsw-alias-scrollbar-hover-l1": "#d9afbf",
					"--dsw-alias-scrollbar-hover-l2": "#d9afbf"
				}
			}
		];

		//#region dsh-dream-skin: DFL brand logo override (sidebar)
		/**
		 * Replaces the DSH whale + "deepseek" wordmark / fish in the left sidebar
		 * brand row with the animated DFL personal brand mark (Permanent Marker
		 * "DFL" glitch logo - the brand-dna signature loop: ink shadow + yellow/blue
		 * offset layers + red main, clip-sliced) while keeping the "HARNESS" pill
		 * of the original wordmark. The wide brand button shows [DFL] [HARNESS];
		 * the collapsed rail shows just the glitch mark. The logo is injected as
		 * real DOM (background images cannot animate), kept in sync by a
		 * MutationObserver, and styled via CSS-module suffix selectors
		 * (_logoRow / _brandMark / _brandName / _railMark) so the hash prefix
		 * of the current build does not matter. The same stylesheet also hides
		 * the DeepSeek whale mark in the conversation hero (fishHitbox /
		 * headline grid column collapsed so the hero headline stays centered).
		 */
		/** <style> content: hide the DSH marks, define the DFL glitch lockup. */
		const DFL_BRAND_CSS = [
			/* hide the DSH whale mark + "DeepSeek Harness" wordmark in the sidebar brand row and rail (nested under _brandMark/_brandName/_railMark) */
			"[class*='_logoRow'] [class*='_brandMark'] svg { display: none !important; }",
			"[class*='_logoRow'] [class*='_brandName'] svg { display: none !important; }",
			"[class*='_logoRow'] [class*='_railMark'] svg { display: none !important; }",
			/* hide the DeepSeek whale mark in the conversation hero; collapse its 34px grid column so the headline stays centered */
			"[class*='_fishHitbox'] { display: none !important; }",
			"[class*='_headline'] { grid-template-columns: auto auto !important; }",
			/* DFL glitch lockup */
			".dsh-dfl-brand-wrap { display: inline-flex; align-items: center; gap: 12px; height: 44px; }",
			".dsh-dfl-brand { position: relative; display: inline-block; line-height: 1;",
			"  font-family: 'Permanent Marker', cursive; font-size: 34px; letter-spacing: -1px; }",
			".dsh-dfl-brand-main { position: relative; z-index: 3; color: #D14437;",
			"  text-shadow: 2px 2px 0 #1F1A14; animation: dsh-dfl-glitch-main 1.8s steps(1) infinite; }",
			".dsh-dfl-layer { position: absolute; inset: 0; pointer-events: none; }",
			".dsh-dfl-layer--blue { color: #3B7AB8; z-index: 2; animation: dsh-dfl-glitch-layer 1.8s steps(1) infinite; }",
			".dsh-dfl-layer--yellow { color: #E8B23A; z-index: 1; animation: dsh-dfl-glitch-layer 1.8s steps(1) infinite reverse; }",
			".dsh-dfl-pill { display: inline-flex; align-items: center; height: 24px; padding: 0 9px;",
			"  border-radius: 3px; background: var(--dsw-alias-label-primary);",
			"  color: var(--dsw-alias-label-primary-inverted); font-size: 14px; font-weight: 700;",
			"  letter-spacing: 0.08em; white-space: nowrap; }",
			/* collapsed rail: square-ish mark only */
			".dsh-dfl-brand-wrap--rail { height: 36px; gap: 0; justify-content: center; }",
			".dsh-dfl-brand-wrap--rail .dsh-dfl-brand { font-size: 17px; }",
			".dsh-dfl-brand-wrap--rail .dsh-dfl-brand-main { text-shadow: 1px 1px 0 #1F1A14; }",
			/* brand-dna glitch keyframes, scaled for the sidebar */
			"@keyframes dsh-dfl-glitch-main {",
			"  0%, 35%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }",
			"  36%, 42% { clip-path: inset(0 0 65% 0); transform: translate(-7px, 0); }",
			"  43%, 49% { clip-path: inset(60% 0 0 0); transform: translate(6px, 1px); }",
			"  50%, 55% { clip-path: inset(25% 0 50% 0); transform: translate(-4px, -1px); }",
			"  56%, 60% { clip-path: inset(0 0 0 0); transform: translate(0); }",
			"  75%, 81% { clip-path: inset(40% 0 25% 0); transform: translate(8px, 0); }",
			"  82%, 87% { clip-path: inset(0 0 0 0); transform: translate(0); }",
			"}",
			"@keyframes dsh-dfl-glitch-layer {",
			"  0%, 35%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }",
			"  36%, 42% { clip-path: inset(0 0 65% 0); transform: translate(9px, -2px); }",
			"  43%, 49% { clip-path: inset(60% 0 0 0); transform: translate(-8px, 2px); }",
			"  50%, 55% { clip-path: inset(25% 0 50% 0); transform: translate(6px, 0); }",
			"  56%, 60% { clip-path: inset(0 0 0 0); transform: translate(0); }",
			"  75%, 81% { clip-path: inset(40% 0 25% 0); transform: translate(-10px, 1px); }",
			"  82%, 87% { clip-path: inset(0 0 0 0); transform: translate(0); }",
			"}",
			/* prefers-reduced-motion: static glitch lockup (brand-dna rule) */
			"@media (prefers-reduced-motion: reduce) {",
			"  .dsh-dfl-brand-main, .dsh-dfl-layer { animation: none !important; }",
			"  .dsh-dfl-layer--blue { transform: translate(3px, 0); }",
			"  .dsh-dfl-layer--yellow { transform: translate(-3px, 0); }",
			"}"
		].join("\n");
		/** CSS class of the injected logo wrapper. */
		const DFL_BRAND_WRAP_CLASS = "dsh-dfl-brand-wrap";
		/** Build the DFL lockup DOM ([DFL] [HARNESS], or the rail mark alone). */
		function buildDflBrand(rail) {
			const wrap = document.createElement("span");
			wrap.className = DFL_BRAND_WRAP_CLASS + (rail ? " dsh-dfl-brand-wrap--rail" : "");
			const brand = document.createElement("span");
			brand.className = "dsh-dfl-brand";
			for (const cls of ["dsh-dfl-layer--yellow", "dsh-dfl-layer--blue"]) {
				const layer = document.createElement("span");
				layer.className = "dsh-dfl-layer " + cls;
				layer.textContent = "DFL";
				brand.appendChild(layer);
			}
			const main = document.createElement("span");
			main.className = "dsh-dfl-brand-main";
			main.textContent = "DFL";
			brand.appendChild(main);
			wrap.appendChild(brand);
			if (!rail) {
				const pill = document.createElement("span");
				pill.className = "dsh-dfl-pill";
				pill.textContent = "HARNESS";
				wrap.appendChild(pill);
			}
			return wrap;
		}
		/** Re-sync the injected logo with the live sidebar DOM (cheap no-op when absent). */
		function ensureDflBrand() {
			if (typeof document === "undefined") return;
			if (typeof document.querySelector !== "function") return;
			const logoRow = document.querySelector("[class*='_logoRow']");
			if (logoRow === null) return;
			const brand = logoRow.querySelector(":scope > [class*='_brand']");
			if (brand !== null && brand.querySelector("." + DFL_BRAND_WRAP_CLASS) === null) {
				brand.appendChild(buildDflBrand(false));
			}
			if (logoRow.closest("[class*='_collapsed']") !== null) {
				const toggle = logoRow.querySelector("[class*='_toggle']");
				if (toggle !== null && toggle.querySelector("." + DFL_BRAND_WRAP_CLASS) === null) {
					toggle.appendChild(buildDflBrand(true));
				}
			} else {
				// expanded: drop any leftover rail mark from the toggle
				for (const toggle of logoRow.querySelectorAll("[class*='_toggle']")) {
					const leftover = toggle.querySelector("." + DFL_BRAND_WRAP_CLASS);
					if (leftover !== null) leftover.remove();
				}
			}
		}
		/**
		 * Inject the brand-override stylesheet + logo sync for the fiber lifetime.
		 * @param ctx - client cordis context.
		 */
		function applyBrandLogo(ctx) {
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "dsh-dream-skin";
				style.dataset.pluginCss = "dsh-dream-skin/brand-logo";
				style.textContent = DFL_BRAND_CSS;
				document.head.appendChild(style);
				let raf = 0;
				let observer = null;
				if (typeof MutationObserver !== "undefined" && typeof document.body !== "undefined" && document.body !== null) {
					observer = new MutationObserver(() => {
						if (raf !== 0) return;
						raf = requestAnimationFrame(() => {
							raf = 0;
							ensureDflBrand();
						});
					});
					observer.observe(document.body, { childList: true, subtree: true });
				}
				ensureDflBrand();
				return () => {
					if (observer !== null) observer.disconnect();
					if (raf !== 0) cancelAnimationFrame(raf);
					style.remove();
				};
			}, "dsh-dream-skin: brand logo override");
		}
		//#endregion

		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"skin.title": "皮肤",
			"skin.default": "默认",
			"skin.abyss": "深海渊",
			"skin.aurora": "极光",
			"skin.nebula": "星云",
			"skin.ember": "余烬",
			"skin.midnight": "午夜",
			"skin.ivory": "象牙暖",
			"skin.mist": "晨雾蓝",
			"skin.rose": "蔷薇粉",
			"background.title": "背景图片（壁纸）",
			"background.choose": "选择图片",
			"background.remove": "移除图片",
			"background.opacity": "透明度",
			"background.blur": "模糊",
			"background.sidebarOpacity": "侧边栏透明度",
			"background.rightSidebarOpacity": "右侧边栏透明度",
			"background.hint": "图片显示在主内容区与侧边栏的半透明底上，消息等内层表面保持不透明以保证可读性",
			"background.history": "最近使用",
			"background.historyApply": "点击换回这张壁纸",
			"accent.title": "强调色（Accent）",
			"accent.pick": "选色…",
			"accent.random": "随机",
			"accent.clear": "恢复主题色",
			"accent.hint": "为当前皮肤设置一个自定义强调色（叠加层，不影响皮肤本身）；点「恢复主题色」回到皮肤默认强调色",
			"packs.title": "主题包（本地库）",
			"packs.import": "导入主题包…",
			"packs.share": "复制分享链接",
			"packs.apply": "应用",
			"packs.surprise": "换一个试试",
			"packs.remove": "移除",
			"packs.empty": "还没有主题包。导入一个 JSON 主题包，或内置皮肤会显示在「皮肤」行。",
			"packs.imported": "已导入「{name}」✓",
			"packs.importFailed": "导入失败：{error}",
			"packs.rejected": "主题包被拒绝——\n{errors}",
			"packs.removed": "已移除「{name}」",
			"bg2.title": "高级壁纸（URL / 视频 / 渐变）",
			"bg2.local": "本地图片",
			"bg2.url": "图片链接",
			"bg2.gradient": "渐变",
			"bg2.apply": "应用链接",
			"bg2.autodim": "自动弱化（聚焦任务时不喧宾夺主）",
			"bg2.remove": "清除壁纸",
			"bg2.video": "视频",
			"bg2.videoFile": "选择本地视频…",
			"bg2.videoLocal": "当前：本地视频（IndexedDB）",
			"bg2.videoHint": "本地视频保存在浏览器 IndexedDB，刷新后仍可用；「清除壁纸」会一并删除。视频链接需为可直链播放的 mp4/webm 等地址。",
			"bg2.videoFailed": "视频加载失败，请检查链接是否可直链播放，或重新选择本地视频",
			"bg2.videoSaveFailed": "保存视频失败（可能超出浏览器存储配额）",
			"bg2.videoRestoreFailed": "无法恢复本地视频（文件已被清除），已回到无壁纸状态"
		};

		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"skin.title": "Skins",
			"skin.default": "Default",
			"skin.abyss": "Abyss",
			"skin.aurora": "Aurora",
			"skin.nebula": "Nebula",
			"skin.ember": "Ember",
			"skin.midnight": "Midnight",
			"skin.ivory": "Ivory",
			"skin.mist": "Mist",
			"skin.rose": "Rose",
			"background.title": "Wallpaper",
			"background.choose": "Choose image",
			"background.remove": "Remove",
			"background.opacity": "Opacity",
			"background.blur": "Blur",
			"background.sidebarOpacity": "Sidebar opacity",
			"background.rightSidebarOpacity": "Right sidebar opacity",
			"background.hint": "The image shows through the translucent main canvas and sidebar; inner surfaces stay opaque for readability",
			"background.history": "Recent",
			"background.historyApply": "Click to switch back",
			"accent.title": "Accent",
			"accent.pick": "Pick…",
			"accent.random": "Random",
			"accent.clear": "Reset to theme",
			"accent.hint": "Set a custom accent color for the active skin (an override layer — the skin itself is untouched). Reset to return to the skin's default accent.",
			"packs.title": "Theme Packs (local)",
			"packs.import": "Import pack…",
			"packs.share": "Copy share link",
			"packs.apply": "Apply",
			"packs.surprise": "Surprise me",
			"packs.remove": "Remove",
			"packs.empty": "No packs yet. Import a JSON theme pack, or pick a built-in skin from the Skins row.",
			"packs.imported": "Imported \"{name}\" ✓",
			"packs.importFailed": "Import failed: {error}",
			"packs.rejected": "Theme pack rejected —\n{errors}",
			"packs.removed": "Removed \"{name}\"",
			"bg2.title": "Advanced Wallpaper (URL / video / gradient)",
			"bg2.local": "Local image",
			"bg2.url": "Image URL",
			"bg2.gradient": "Gradient",
			"bg2.apply": "Apply link",
			"bg2.autodim": "Auto-dim (gently fade while focusing tasks)",
			"bg2.remove": "Clear wallpaper",
			"bg2.video": "Video",
			"bg2.videoFile": "Choose local video…",
			"bg2.videoLocal": "Current: local video (IndexedDB)",
			"bg2.videoHint": "Local videos live in the browser's IndexedDB and survive refreshes; \"Clear wallpaper\" deletes them. Video links must be directly playable mp4/webm URLs.",
			"bg2.videoFailed": "Failed to load the video; check that the link is directly playable, or re-pick a local file",
			"bg2.videoSaveFailed": "Failed to save the video (browser storage quota may be exceeded)",
			"bg2.videoRestoreFailed": "Could not restore the local video (file was cleared); wallpaper reset"
		};
		//#endregion

		//#region dsh-dream-skin: persistence
		/** Read a localStorage string value (null on absence or error). */
		function readStorage(key) {
			try {
				const value = window.localStorage.getItem(key);
				return typeof value === "string" ? value : null;
			} catch {
				return null;
			}
		}

		/** Write (or remove with null) a localStorage value. */
		function writeStorage(key, value) {
			try {
				if (value === null) window.localStorage.removeItem(key);
				else window.localStorage.setItem(key, value);
			} catch {
				// storage unavailable / quota — the preference stays process-local
			}
		}

		/** Saved skin id (may be unknown/absent). */
		function readSavedSkin() {
			return readStorage(STORAGE_KEY);
		}

		/** Persist a skin choice; DEFAULT_SKIN clears the stored value. */
		function writeSavedSkin(id) {
			writeStorage(STORAGE_KEY, id === DEFAULT_SKIN ? null : id);
		}

		/** Wallpaper data URL (null when unset). */
		function readWallpaper() {
			const value = readStorage(WALLPAPER_KEY);
			return value !== null && value.length > 0 ? value : null;
		}

		/** Wash opacity 0..1 (clamped; default when unset). */
		function readWallpaperOpacity() {
			const raw = readStorage(WALLPAPER_OPACITY_KEY);
			if (raw === null) return DEFAULT_WALLPAPER_OPACITY;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_WALLPAPER_OPACITY;
		}

		/** Blur radius in px (clamped to 0..60; default when unset). */
		function readWallpaperBlur() {
			const raw = readStorage(WALLPAPER_BLUR_KEY);
			if (raw === null) return DEFAULT_WALLPAPER_BLUR;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(60, Math.max(0, value)) : DEFAULT_WALLPAPER_BLUR;
		}
		/** Sidebar wash opacity 0..1 (clamped; default when unset). */
		function readSidebarOpacity() {
			const raw = readStorage(SIDEBAR_OPACITY_KEY);
			if (raw === null) return DEFAULT_SIDEBAR_OPACITY;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_SIDEBAR_OPACITY;
		}
		/** Right-sidebar (dsh-better-sidebar) wash opacity 0..1 (clamped; default when unset). */
		function readRightSidebarOpacity() {
			const raw = readStorage(RIGHT_SIDEBAR_OPACITY_KEY);
			if (raw === null) return DEFAULT_RIGHT_SIDEBAR_OPACITY;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_RIGHT_SIDEBAR_OPACITY;
		}
		//#endregion

		//#region dsh-dream-skin: wallpaper layer + token shading
		/** The fixed backdrop layer (z-index -1), created lazily. */
		let wallpaperEl = null;
		/** Disposer for the current token-override layer. */
		let wallpaperOverrideDispose = null;

		/** Parse a hex or rgb()/rgba() color into rgba() with the given alpha. */
		function toRgba(color, alpha) {
			const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
			if (hex !== null) {
				let digits = hex[1];
				if (digits.length === 3) digits = digits.split("").map((char) => char + char).join("");
				const n = parseInt(digits, 16);
				return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
			}
			const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(color.trim());
			if (rgb !== null) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
			return color.trim();
		}

		/**
		 * The base color for one scheme: the active skin's `--dsw-alias-bg-base`
		 * when it owns that scheme, otherwise the built-in base. The wash always
		 * carries the active skin's tint (and re-shades on theme/change).
		 */
		function resolveBase(scheme, active) {
			if (active.colorScheme === scheme && typeof active.tokens["--dsw-alias-bg-base"] === "string") {
				return active.tokens["--dsw-alias-bg-base"];
			}
			return BUILTIN_BASE[scheme];
		}
		function resolveSidebar(scheme, active) {
			if (active.colorScheme === scheme && typeof active.tokens["--dsw-specific-sidebar-fill"] === "string") {
				return active.tokens["--dsw-specific-sidebar-fill"];
			}
			return resolveBase(scheme, active);
		}
		function resolveLayer1(scheme, active) {
			if (active.colorScheme === scheme && typeof active.tokens["--dsw-alias-bg-layer-1"] === "string") {
				return active.tokens["--dsw-alias-bg-layer-1"];
			}
			return resolveBase(scheme, active);
		}

		/** Remove the wallpaper layer(s) and token overrides (fiber unload). */
		function teardownWallpaper() {
			removeRightSidebarWash();
			wallpaperEl?.remove();
			wallpaperEl = null;
			teardownVideoLayer();
			wallpaperOverrideDispose?.();
			wallpaperOverrideDispose = null;
		}
		//#endregion

		//#region dsh-dream-skin: image compression
		/**
		 * Downscale an image onto a canvas and return a JPEG data URL, so a
		 * wallpaper stays well inside the localStorage quota (≤ ~2MB).
		 */
		function compressImage(image, maxSide, quality) {
			const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(image.width * scale));
			canvas.height = Math.max(1, Math.round(image.height * scale));
			const context = canvas.getContext("2d");
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			return canvas.toDataURL("image/jpeg", quality);
		}

		/** Read a picked file into a compressed data URL (null on failure). */
		function readImageAsDataUrl(file, onDone) {
			const reader = new FileReader();
			reader.onerror = () => onDone(null);
			reader.onload = () => {
				const image = new Image();
				image.onerror = () => onDone(null);
				image.onload = () => {
					try {
						let dataUrl = compressImage(image, 1600, 0.75);
						if (dataUrl.length > 2000000) dataUrl = compressImage(image, 1000, 0.6);
						if (dataUrl.length > 2000000) dataUrl = compressImage(image, 800, 0.5);
						onDone(dataUrl);
					} catch {
						onDone(null);
					}
				};
				image.src = reader.result;
			};
			reader.readAsDataURL(file);
		}
		//#endregion

		//#region dsh-dream-skin: settings row stores
		/**
		 * Skin row slot store: a mirror of the theme service snapshot. The
		 * plugin's apply-world change listener is the only writer; the row
		 * component reads via props.useStore.
		 */
		function createSkinStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({
					skin: "system",
					revision: -1
				}),
				actions: {
					sync: (d, skin, revision) => {
						if (revision <= d.revision) return;
						d.skin = skin;
						d.revision = revision;
					}
				}
			});
		}

		/** Wallpaper row store: url + opacity + blur, written only by this plugin. */
		function createWallpaperStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({
					url: null,
					opacity: DEFAULT_WALLPAPER_OPACITY,
					blur: DEFAULT_WALLPAPER_BLUR,
					sidebarOpacity: DEFAULT_SIDEBAR_OPACITY,
					rightSidebarOpacity: DEFAULT_RIGHT_SIDEBAR_OPACITY,
					history: [],
					revision: -1
				}),
				actions: {
					sync: (d, url, opacity, blur, sidebarOpacity, rightSidebarOpacity, history, revision) => {
						if (revision <= d.revision) return;
						d.url = url;
						d.opacity = opacity;
						d.blur = blur;
						d.sidebarOpacity = sidebarOpacity;
						d.rightSidebarOpacity = rightSidebarOpacity;
						d.history = history;
						d.revision = revision;
					}
				}
			});
		}
		//#endregion

		//#region dsh-dream-skin: settings rows
		/** Inline style sheet for the rows (kept dependency-free). */
		const styles = {
			group: {
				borderBottom: "1px solid var(--dsw-alias-border-l2)",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "16px 0"
			},
			section: {
				display: "flex",
				flexDirection: "column",
				width: "100%"
			},
			title: {
				color: "var(--dsw-alias-label-primary)",
				fontSize: "14px",
				fontWeight: 400,
				lineHeight: "22px"
			},
			hint: {
				color: "var(--dsw-alias-label-tertiary)",
				fontSize: "12px",
				lineHeight: "18px"
			},
			grid: {
				display: "flex",
				flexWrap: "wrap",
				gap: "10px"
			},
			card: {
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "6px",
				width: "96px",
				padding: "3px",
				borderRadius: "10px",
				background: "transparent",
				border: "none",
				cursor: "pointer",
				font: "inherit",
				boxSizing: "border-box",
				position: "relative",
				outline: "none"
			},
			cardSelected: {
				boxShadow: "0 0 0 2px var(--dsw-alias-brand-primary)",
				background: "rgba(127, 127, 127, 0.10)"
			},
			cardCheck: {
				position: "absolute",
				top: "-4px",
				right: "-4px",
				width: "18px",
				height: "18px",
				borderRadius: "50%",
				background: "var(--dsw-alias-brand-primary)",
				color: "#ffffff",
				fontSize: "12px",
				lineHeight: "18px",
				textAlign: "center",
				fontWeight: 700
			},
			cardLabel: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "12px",
				lineHeight: "16px",
				whiteSpace: "nowrap"
			},
			cardLabelSelected: {
				color: "var(--dsw-alias-label-primary)"
			},
			swatch: {
				width: "100%",
				height: "52px",
				borderRadius: "8px",
				boxSizing: "border-box",
				padding: "8px",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				gap: "6px"
			},
			swatchLine: {
				height: "7px",
				borderRadius: "4px"
			},
			defaultSwatch: {
				width: "100%",
				height: "52px",
				borderRadius: "8px",
				boxSizing: "border-box",
				display: "flex",
				overflow: "hidden",
				border: "1px solid var(--dsw-alias-border-l2)"
			},
			button: {
				height: "32px",
				padding: "0 14px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "var(--dsw-alias-button-elevated-fill)",
				color: "var(--dsw-alias-label-primary)",
				cursor: "pointer",
				fontSize: "13px",
				font: "inherit",
				boxSizing: "border-box"
			},
			buttonDanger: {
				color: "var(--dsw-alias-state-error-primary)"
			},
			tinyButton: {
				height: "22px",
				padding: "0 8px",
				borderRadius: "6px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				cursor: "pointer",
				font: "inherit",
				fontSize: "11px",
				lineHeight: "16px"
			},
			tinyButtonActive: {
				color: "var(--dsw-alias-brand-primary)",
				borderColor: "var(--dsw-alias-brand-primary)"
			},
			urlInput: {
				flex: 1,
				minWidth: "220px",
				height: "32px",
				padding: "0 10px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "var(--dsw-alias-bg-layer-1)",
				color: "var(--dsw-alias-label-primary)",
				font: "inherit",
				fontSize: "13px",
				boxSizing: "border-box"
			},
			presetswatches: {
				width: "48px",
				height: "32px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				cursor: "pointer",
				padding: 0
			},
			historyThumb: {
				width: "56px",
				height: "36px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				cursor: "pointer",
				padding: 0,
				boxSizing: "border-box",
				backgroundSize: "cover",
				backgroundPosition: "center"
			},
			accentPreset: {
				width: "24px",
				height: "24px",
				borderRadius: "50%",
				border: "1px solid rgba(128,128,128,0.4)",
				cursor: "pointer",
				padding: 0,
				boxSizing: "border-box"
			},
			accentDot: {
				width: "22px",
				height: "22px",
				borderRadius: "50%",
				border: "1px solid var(--dsw-alias-border-l2)",
				boxSizing: "border-box",
				flex: "none"
			},
			accentHex: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "13px",
				lineHeight: "20px",
				fontFamily: "ui-monospace, monospace"
			},
			checkbox: {
				accentColor: "var(--dsw-alias-brand-primary)",
				width: "16px",
				height: "16px"
			},
			preview: {
				width: "72px",
				height: "44px",
				objectFit: "cover",
				borderRadius: "6px",
				border: "1px solid var(--dsw-alias-border-l2)"
			},
			actionRow: {
				display: "flex",
				alignItems: "center",
				gap: "10px",
				flexWrap: "wrap"
			},
			sliderRow: {
				display: "flex",
				alignItems: "center",
				gap: "10px",
				minWidth: "240px"
			},
			sliderLabel: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "13px",
				whiteSpace: "nowrap",
				width: "90px"
			},
			slider: {
				flex: 1,
				accentColor: "var(--dsw-alias-brand-primary)"
			},
			sliderValue: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "12px",
				whiteSpace: "nowrap",
				width: "44px",
				textAlign: "right"
			}
		};

		/** Mini palette preview driven by one skin's token table. */
		function Swatch({ tokens }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...styles.swatch,
					background: tokens["--dsw-alias-bg-layer-1"],
					border: `1px solid ${tokens["--dsw-alias-border-l2"]}`
				},
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: {
							...styles.swatchLine,
							width: "70%",
							background: tokens["--dsw-alias-label-primary"],
							opacity: 0.85
						}
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: {
							...styles.swatchLine,
							width: "45%",
							background: tokens["--dsw-alias-brand-primary"]
						}
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: {
							...styles.swatchLine,
							width: "55%",
							background: tokens["--dsw-alias-label-secondary"],
							opacity: 0.55
						}
					})
				]
			});
		}

		/** "Default" chip: follow the built-in appearance (light + dark halves). */
		function DefaultSwatch() {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.defaultSwatch,
				children: [
					(0, react_jsx_runtime.jsx)("div", { style: { flex: 1, background: "#f4f4f5" } }),
					(0, react_jsx_runtime.jsx)("div", { style: { flex: 1, background: "#1c1c20" } })
				]
			});
		}

		/** One selectable skin card. */
		function SkinCard({ skin, selected, onSelect, t }) {
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onSelect,
				"aria-pressed": selected,
				style: {
					...styles.card,
					...(selected ? styles.cardSelected : {})
				},
				children: [
					selected ? (0, react_jsx_runtime.jsx)("span", {
						style: styles.cardCheck,
						children: "✓"
					}) : null,
					(0, react_jsx_runtime.jsx)(Swatch, { tokens: skin.tokens }),
					(0, react_jsx_runtime.jsx)("span", {
						style: {
							...styles.cardLabel,
							...(selected ? styles.cardLabelSelected : {})
						},
						children: t(`skin.${skin.id}`)
					})
				]
			});
		}

		/**
		 * Skin picker row registered into the Settings → General item slot,
		 * right after the built-in Appearance row: title + a "Default" chip and
		 * one swatch card per curated skin.
		 */
		function SkinRow({ t, setSkin, useStore }) {
			const skin = useStore((s) => s.skin);
			const selected = SKINS.some((candidate) => candidate.id === skin) ? skin : null;
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("skin.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.grid,
						children: [
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSkin(DEFAULT_SKIN),
								"aria-pressed": selected === null,
								style: {
									...styles.card,
									...(selected === null ? styles.cardSelected : {})
								},
								children: [
									(0, react_jsx_runtime.jsx)(DefaultSwatch, {}),
									(0, react_jsx_runtime.jsx)("span", {
										style: {
											...styles.cardLabel,
											...(selected === null ? styles.cardLabelSelected : {})
										},
										children: t("skin.default")
									})
								]
							}),
							SKINS.map((skinDefinition) => (0, react_jsx_runtime.jsx)(SkinCard, {
								skin: skinDefinition,
								selected: selected === skinDefinition.id,
								onSelect: () => setSkin(skinDefinition.id),
								t
							}, skinDefinition.id))
						]
					})
				]
			});
		}

		/** One labeled slider (opacity or blur). */
		function Slider({ label, value, min, max, step, format, onChange }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.sliderRow,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						style: styles.sliderLabel,
						children: label
					}),
					(0, react_jsx_runtime.jsx)("input", {
						type: "range",
						min,
						max,
						step,
						value,
						style: styles.slider,
						onChange: (event) => onChange(Number(event.target.value))
					}),
					(0, react_jsx_runtime.jsx)("span", {
						style: styles.sliderValue,
						children: format(value)
					})
				]
			});
		}

		/**
		 * Wallpaper row: choose (compressed to a data URL), preview, tune the
		 * wash opacity and blur, and remove the wallpaper.
		 */
		function WallpaperRow({ t, setWallpaper, setOpacity, setBlur, setSidebarOpacity, setRightSidebarOpacity, applyFromHistory, useStore }) {
			const url = useStore((s) => s.url);
			const opacity = useStore((s) => s.opacity);
			const blur = useStore((s) => s.blur);
			const sidebarOpacity = useStore((s) => s.sidebarOpacity);
			const rightSidebarOpacity = useStore((s) => s.rightSidebarOpacity);
			const history = useStore((s) => s.history);
			const inputRef = (0, _react.useRef)(null);
			const onPick = () => inputRef.current?.click();
			const onFile = (event) => {
				const file = event.target.files?.[0];
				if (file === void 0) return;
				readImageAsDataUrl(file, (dataUrl) => {
					if (dataUrl !== null) setWallpaper(dataUrl);
					event.target.value = "";
				});
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("background.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							url !== null ? (0, react_jsx_runtime.jsx)("img", {
								src: url,
								alt: "",
								style: styles.preview
							}) : null,
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: onPick,
								children: t("background.choose")
							}),
							url !== null ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: {
									...styles.button,
									...styles.buttonDanger
								},
								onClick: () => setWallpaper(null),
								children: t("background.remove")
							}) : null,
							(0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								type: "file",
								accept: "image/*",
								style: { display: "none" },
								onChange: onFile
							})
						]
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.opacity"),
						value: Math.round(opacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: setOpacity
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.blur"),
						value: blur,
						min: 0,
						max: 60,
						step: 1,
						format: (v) => `${v}px`,
						onChange: setBlur
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.sidebarOpacity"),
						value: Math.round(sidebarOpacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: setSidebarOpacity
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.rightSidebarOpacity"),
						value: Math.round(rightSidebarOpacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: setRightSidebarOpacity
					}),
					history && history.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
						style: { ...styles.group, padding: "8px 0", borderBottom: "none" },
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								style: styles.title,
								children: t("background.history")
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								style: styles.actionRow,
								children: history.map((entry, i) => {
									// URL entries must be wrapped in url("...") too — a bare
									// URL string is not a valid CSS background value and would
									// render a blank thumbnail (gradients are fine as-is).
									const isVideo = entry.kind === "video";
									const isImage = entry.kind !== "gradient" && entry.kind !== "url" && !isVideo;
									const bg = isImage || entry.kind === "url"
										? `url("${entry.value}") center/cover no-repeat`
										: entry.value;
									return (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										title: t("background.historyApply"),
										style: {
											...styles.historyThumb,
											background: isVideo ? "#10131a" : bg,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "14px"
										},
										onClick: () => applyFromHistory(entry.kind, entry.value),
										children: isVideo ? "▶" : null
									}, i);
								})
							})
						]
					}) : null,
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.hint,
						children: t("background.hint")
					})
				]
			});
		}

		/**
		 * Advanced wallpaper row (P0-3): a URL or gradient preset as the backdrop
		 * instead of a local image, plus an auto-dim toggle. Kept separate from
		 * the image row so the two workflows don't fight over the same preview.
		 */
		function WallpaperAdvancedRow({ t, useStore, setKind, setUrl, setGradient, setVideo, setVideoFile, setAutodim, clearAll }) {
			const kind = useStore((s) => s.kind);
			const url = useStore((s) => s.url);
			const gradient = useStore((s) => s.gradient);
			const video = useStore((s) => s.video);
			const videoRevision = useStore((s) => s.revision);
			const autodim = useStore((s) => s.autodim);
			const urlState = (0, _react.useState)("");
			const urlValue = urlState[0];
			const setUrlValue = urlState[1];
			const videoUrlState = (0, _react.useState)("");
			const videoValue = videoUrlState[0];
			const setVideoValue = videoUrlState[1];
			const videoInputRef = (0, _react.useRef)(null);
			// Live preview of the applied video (object URL for IndexedDB-backed
			// files, the raw URL otherwise). The ref owns the object URL so the
			// effect can revoke it on change/unmount.
			//
			// The effect depends on the store REVISION too, not just `video`:
			// `useStore` only re-renders when the selected slice changes, and a
			// second pick of a local file leaves `video` at the SAME sentinel
			// value (idb://...) — without the revision subscription the preview
			// would never refresh to the newly stored blob.
			const videoPreviewState = (0, _react.useState)(null);
			const videoPreview = videoPreviewState[0];
			const setVideoPreview = videoPreviewState[1];
			const previewUrlRef = (0, _react.useRef)(null);
			(0, _react.useEffect)(() => {
				let alive = true;
				if (previewUrlRef.current !== null) {
					try { URL.revokeObjectURL(previewUrlRef.current); } catch {}
					previewUrlRef.current = null;
				}
				setVideoPreview(null);
				if (video === IDB_VIDEO_REF) {
					idbLoadVideo().then((blob) => {
						if (blob === null || !alive) return;
						const url = URL.createObjectURL(blob);
						previewUrlRef.current = url;
						setVideoPreview(url);
					});
				} else if (typeof video === "string" && video.length > 4) {
					setVideoPreview(video);
				}
				return () => {
					alive = false;
					if (previewUrlRef.current !== null) {
						try { URL.revokeObjectURL(previewUrlRef.current); } catch {}
						previewUrlRef.current = null;
					}
				};
			}, [video, videoRevision]);
			const onPickVideo = () => videoInputRef.current?.click();
			const onVideoFile = (event) => {
				const file = event.target.files?.[0];
				if (file === void 0) return;
				setVideoFile(file);
				event.target.value = "";
			};
			const KIND_OPTIONS = [
				{ id: "image", label: t("bg2.local") },
				{ id: "url", label: t("bg2.url") },
				{ id: "video", label: t("bg2.video") },
				{ id: "gradient", label: t("bg2.gradient") }
			];
			const GRADS = [
				"linear-gradient(135deg, #0b1120 0%, #172554 55%, #1e3a8a 100%)",
				"linear-gradient(135deg, #022c22 0%, #0d9488 100%)",
				"linear-gradient(135deg, #1e1b4b 0%, #7e22ce 100%)",
				"linear-gradient(135deg, #251607 0%, #c2410c 100%)",
				"linear-gradient(135deg, #faf5eb 0%, #e7dfcb 100%)",
				"linear-gradient(135deg, #fdf2f6 0%, #f0d2dc 100%)"
			];
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("bg2.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: KIND_OPTIONS.map((opt) => (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-pressed": kind === opt.id,
							style: {
								...styles.tinyButton,
								...(kind === opt.id ? styles.tinyButtonActive : {})
							},
							onClick: () => setKind(opt.id),
							children: [opt.label]
						}, opt.id))
					}),
					kind === "url" ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								type: "url",
								placeholder: "https://example.com/wall.jpg",
								defaultValue: url || "",
								style: { ...styles.urlInput },
								onChange: (event) => setUrlValue(event.target.value)
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => setUrl(urlValue),
								children: t("bg2.apply")
							})
						]
					}) : null,
					kind === "video" ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.group,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								style: styles.actionRow,
								children: [
									(0, react_jsx_runtime.jsx)("input", {
										type: "url",
										placeholder: "https://example.com/wall.mp4",
										defaultValue: video && video !== IDB_VIDEO_REF ? video : "",
										style: { ...styles.urlInput },
										onChange: (event) => setVideoValue(event.target.value)
									}),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: styles.button,
										onClick: () => setVideo(videoValue && videoValue.length > 4 ? videoValue : null),
										children: t("bg2.apply")
									})
								]
							}),
							videoPreview ? (0, react_jsx_runtime.jsx)("video", {
								src: videoPreview,
								muted: true,
								loop: true,
								autoPlay: true,
								playsInline: true,
								style: { width: "100%", maxHeight: "140px", borderRadius: "8px", border: "1px solid var(--dsw-alias-border-l2)", background: "#000", objectFit: "cover" }
							}) : null,
							typeof video === "string" && video !== IDB_VIDEO_REF ? (0, react_jsx_runtime.jsx)("div", {
								style: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", overflowWrap: "anywhere" },
								children: video
							}) : null,
							(0, react_jsx_runtime.jsxs)("div", {
								style: styles.actionRow,
								children: [
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: styles.button,
										onClick: onPickVideo,
										children: t("bg2.videoFile")
									}),
									video === IDB_VIDEO_REF ? (0, react_jsx_runtime.jsx)("span", {
										style: { color: "var(--dsw-alias-label-secondary)", fontSize: "13px", alignSelf: "center" },
										children: t("bg2.videoLocal")
									}) : null,
									(0, react_jsx_runtime.jsx)("input", {
										ref: videoInputRef,
										type: "file",
										accept: "video/*",
										style: { display: "none" },
										onChange: onVideoFile
									})
								]
							}),
							(0, react_jsx_runtime.jsx)("div", {
								style: styles.hint,
								children: t("bg2.videoHint")
							})
						]
					}) : null,
					kind === "gradient" ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.grid,
						children: GRADS.map((g) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-pressed": gradient === g,
							style: {
								...styles.presetswatches,
								background: g,
								...(gradient === g ? { outline: "2px solid var(--dsw-alias-brand-primary)" } : {})
							},
							onClick: () => setGradient(g),
							children: null
						}, g))
					}) : null,
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: autodim,
								style: styles.checkbox,
								onChange: (event) => setAutodim(event.target.checked)
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: { color: "var(--dsw-alias-label-secondary)", fontSize: "13px" },
								children: t("bg2.autodim")
							})
						]
					}),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: { ...styles.button, ...styles.buttonDanger },
						onClick: clearAll,
						children: t("bg2.remove")
					})
				]
			});
		}
		//#endregion

		//#region dsh-dream-skin: P0 shared utilities (packs, accent, persistence, random)
		/**
		 * P0 feature layer: theme-pack import/export, per-user accent override,
		 * wallpaper 2.0, dual persistence, a local theme-pack library with
		 * one-click apply + validation + rollback, and surprise-me / favorites.
		 *
		 * Constraint note: DSH's Host settings wire only exposes an allowlisted
		 * set of namespaces to browser clients (WEB_SETTINGS_NAMESPACES in
		 * dsh-host-apiproxy), so a third-party namespace answers
		 * `settings-not-exposed` even when registered. localStorage/IndexedDB are
		 * therefore the reliable persistence for third-party state; a host
		 * settings write is attempted best-effort and never depended on.
		 */

		/** Pack manifest format marker. */
		const PACK_FORMAT = "dsh-dream-skin/pack";
		/** Current pack manifest version. */
		const PACK_VERSION = 1;
		/** Size cap for an imported pack JSON (≈1 MiB). */
		const PACK_MAX_BYTES = 1024 * 1024;
		/** localStorage keys for P0 state. */
		const PACKS_KEY = "dsh-dream-skin:packs"; // JSON array of remote/manual pack manifests
		const ACCENT_KEY = "dsh-dream-skin:accent"; // hex accent (#rrggbb) or "system"
		const FAVORITES_KEY = "dsh-dream-skin:favorites"; // JSON array of theme/ pack ids
		const WALLPAPER_URL_KEY = "dsh-dream-skin:wallpaper-url";
		const WALLPAPER_KIND_KEY = "dsh-dream-skin:wallpaper-kind"; // 'image'|'url'|'gradient'
		const WALLPAPER_GRADIENT_KEY = "dsh-dream-skin:wallpaper-gradient";
		/** localStorage key holding the video wallpaper source (URL or IDB sentinel). */
		const WALLPAPER_VIDEO_KEY = "dsh-dream-skin:wallpaper-video";
		/** Sentinel marking a video wallpaper whose bytes live in IndexedDB. */
		const IDB_VIDEO_REF = "idb://dream-skin-video";
		const WALLPAPER_AUTODIM_KEY = "dsh-dream-skin:wallpaper-autodim"; // '1'|'0'
		/** Sentinel meaning "no accent override — follow the theme's own accent". */
		const DEFAULT_ACCENT = "system";
		/** Marker for a skin that is actually a user-imported pack. */
		const PACK_ID_PREFIX = "dream-pack:";

		/**
		 * Minimum token set a pack must define so it renders coherently.
		 * See docs/theme-spec.md for the full token contract. These are the
		 * core surfaces; missing others fall back to (or are shimmed from) these.
		 */
		const PACK_REQUIRED_TOKENS = [
			"--dsw-alias-bg-base",
			"--dsw-alias-bg-layer-1",
			"--dsw-alias-brand-primary",
			"--dsw-alias-label-primary",
			"--dsw-alias-label-secondary",
			"--dsw-alias-border-l1",
			"--dsw-alias-border-l2"
		];

		/** Regex for a 3/6-digit hex color. */
		const HEX_RE = /^#[\da-f]{3}(?:[\da-f]{3})?$/i;

		/** true when a value is a syntactically plausible CSS color. */
		function looksLikeColor(value) {
			return typeof value === "string" && (HEX_RE.test(value.trim()) || /^(rgb|rgba|hsl|hsla)\(/.test(value.trim()));
		}

		/** Normalize a hex to #rrggbb lowercase, or null. */
		function normalizeHex(value) {
			const m = HEX_RE.exec(String(value ?? "").trim());
			if (!m) return null;
			let hex = m[0].toLowerCase();
			if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
			return hex;
		}

		/**
		 * Validate a parsed pack manifest structure. Returns a { ok, errors }
		 * result WITHOUT mutating it. On ok, the caller receives a normalized copy
		 * with a guaranteed stable `id` and a merged full token table.
		 */
		function validatePack(data) {
			if (typeof data !== "object" || data === null) return { ok: false, errors: ["not an object"] };
			if (data.format !== PACK_FORMAT) return { ok: false, errors: [`format must be "${PACK_FORMAT}"`] };
			if (data.version !== PACK_VERSION) return { ok: false, errors: [`unsupported pack version ${data.version}`] };
			const manifest = data.manifest;
			if (typeof manifest !== "object" || manifest === null) return { ok: false, errors: ["missing manifest"] };
			if (typeof manifest.id !== "string" || !manifest.id.trim()) return { ok: false, errors: ["manifest.id is required"] };
			const id = PACK_ID_PREFIX + manifest.id;
			if (id === "system" || id === "light" || id === "dark") return { ok: false, errors: [`"${manifest.id}" collides with a reserved id`] };
			if (typeof manifest.name !== "string" || !manifest.name.trim()) return { ok: false, errors: ["manifest.name is required"] };
			if (manifest.colorScheme !== "light" && manifest.colorScheme !== "dark") return { ok: false, errors: [`colorScheme must be light|dark, got ${manifest.colorScheme}`] };
			if (typeof manifest.tokens !== "object" || manifest.tokens === null) return { ok: false, errors: ["manifest.tokens is required"] };
			const tokens = {};
			const errors = [];
			for (const name of PACK_REQUIRED_TOKENS) {
				const value = manifest.tokens[name];
				if (typeof value !== "string" || !looksLikeColor(value)) errors.push(`token ${name} is missing or not a color`);
				else tokens[name] = value;
			}
			// Copy the remaining user-supplied tokens (already owned/validated colors).
			for (const [name, value] of Object.entries(manifest.tokens)) {
				if (!(name in tokens) && typeof value === "string" && looksLikeColor(value)) tokens[name] = value;
			}
			const accent = manifest.accent ? normalizeHex(manifest.accent) : null;
			const pack = {
				format: PACK_FORMAT,
				version: PACK_VERSION,
				manifest: {
					id: manifest.id,
					name: manifest.name,
					nameZh: typeof manifest.nameZh === "string" ? manifest.nameZh : undefined,
					author: typeof manifest.author === "string" ? manifest.author : "anonymous",
					version: typeof manifest.version === "string" ? manifest.version : "1.0.0",
					description: typeof manifest.description === "string" ? manifest.description : "",
					colorScheme: manifest.colorScheme,
					tokens,
					accent
				}
			};
			if (errors.length) return { ok: false, errors };
			return { ok: true, id, pack };
		}

		/** Turn a validated pack manifest into a ThemeRegistration for the runtime. */
		function packToRegistration(pack) {
			return Object.freeze({
				id: PACK_ID_PREFIX + pack.manifest.id,
				colorScheme: pack.manifest.colorScheme,
				tokens: { ...pack.manifest.tokens }
			});
		}

		/**
		 * In-process registry of imported packs. Kept outside React/localStorage
		 * so a pack can be registered into ctx.theme immediately on import and
		 * re-registered on reload without waiting for a slot mount.
		 */
		const importedPacks = [];
		/** Disposers for every pack we registered into ctx.theme, keyed by id. */
		const packDisposers = new Map();

		/** Register or refresh one pack into the theme runtime (idempotent). */
		function applyPackToTheme(ctx, id, registration) {
			const existing = packDisposers.get(id);
			if (existing) {
				existing(); // dispose old layer → theme reset if it was active
				packDisposers.delete(id);
			}
			packDisposers.set(id, ctx.theme.register(registration));
		}

		/** Dispose all packs (on plugin unload). */
		function disposeAllPacks() {
			for (const dispose of packDisposers.values()) dispose();
			packDisposers.clear();
			importedPacks.length = 0;
		}

		/** Read the persisted pack-manifest list. */
		function readPacks() {
			const raw = readStorage(PACKS_KEY);
			if (raw === null) return [];
			try {
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed : [];
			} catch {
				return [];
			}
		}

		/** Persist the pack-manifest list (removing any entry whose id is empty). */
		function writePacks(packs) {
			writeStorage(PACKS_KEY, JSON.stringify(packs.filter((p) => p && p.id)));
		}

		/** Find a pack manifest by id. */
		function findPack(id) {
			return importedPacks.find((p) => p && p.id === id);
		}

		/** Import a validated pack: register it, add to the in-process + persisted list. */
		function importPack(ctx, result) {
			const { id, pack } = result;
			if (findPack(id)) return { ok: false, error: "a pack with this id is already imported" };
			const registration = packToRegistration(pack);
			try {
				applyPackToTheme(ctx, id, registration);
			} catch (e) {
				return { ok: false, error: "register failed: " + (e && e.message ? e.message : String(e)) };
			}
			const record = { id, manifest: pack.manifest };
			importedPacks.push({ ...record, registration });
			const packs = readPacks();
			packs.push({ id, manifest: pack.manifest });
			writePacks(packs);
			return { ok: true, id, name: pack.manifest.name, colorScheme: pack.manifest.colorScheme };
		}

		/** Remove an imported pack by id (falls back to built-in skin if it was active). */
		function unimportPack(ctx, id) {
			const idx = importedPacks.findIndex((p) => p && p.id === id);
			if (idx === -1) return;
			const [removed] = importedPacks.splice(idx, 1);
			const dispose = packDisposers.get(id);
			if (dispose) {
				dispose();
				packDisposers.delete(id);
			}
			const packs = readPacks().filter((p) => p.id !== id);
			writePacks(packs);
			// If the removed pack was active, fall back to the built-in appearance.
			if (ctx.theme.getTheme().preference === id) ctx.theme.setTheme(DEFAULT_SKIN);
			const favorites = readFavorites().filter((f) => f !== id);
			writeFavorites(favorites);
			return removed && removed.manifest ? removed.manifest.name : id;
		}

		/** Re-register persisted packs on (re)load, before restoring the saved skin. */
		function restorePacks(ctx) {
			for (const record of readPacks()) {
				if (!record || !record.manifest || !record.manifest.tokens) continue;
				const validate = validatePack({ format: PACK_FORMAT, version: PACK_VERSION, manifest: record.manifest });
				if (!validate.ok) continue;
				const regression = packToRegistration(validate.pack);
				try {
					applyPackToTheme(ctx, validate.id, regression);
					importedPacks.push({ id: validate.id, manifest: validate.pack.manifest, registration: regression });
				} catch {
					// skip a pack that fails to re-register
				}
			}
		}

		/** Export a pack as a downloadable JSON Blob (no server needed). */
		function exportPackAsFile(ctx, id) {
			const record = findPack(id);
			const source = record ? { format: PACK_FORMAT, version: PACK_VERSION, manifest: { ...record.manifest } }
				: null;
			if (!source) return false;
			const blob = new Blob([JSON.stringify(source, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = (source.manifest.name || id).toLowerCase().replace(/\s+/g, "-") + ".dsh-theme.json";
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			return true;
		}

		/** Encode a pack manifest into a shareable URL hash (fragment). */
		function packShareUrl(id) {
			const record = findPack(id);
			if (!record) return null;
			const payload = { format: PACK_FORMAT, version: PACK_VERSION, manifest: record.manifest };
			let encoded;
			try {
				encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
			} catch {
				return null;
			}
			return window.location.origin + window.location.pathname + "#dream-skin-pack=" + encoded;
		}

		/** Decode a shared pack from a URL hash; null when absent/invalid. */
		function decodeShareUrl(hash) {
			const prefix = "#dream-skin-pack=";
			const idx = hash ? hash.indexOf(prefix) : -1;
			if (idx === -1) return null;
			const raw = hash.slice(idx + prefix.length);
			if (!raw) return null;
			try {
				const json = decodeURIComponent(escape(atob(raw)));
				const data = JSON.parse(json);
				const validate = validatePack(data);
				return validate.ok ? { id: validate.id, pack: validate.pack } : null;
			} catch {
				return null;
			}
		}

		/** Pull a desired accent from the active skin/registration + pack accent. */
		function resolveAccent(snapshot) {
			const active = snapshot.active;
			const brand = active && active.tokens ? active.tokens["--dsw-alias-brand-primary"] : null;
			return typeof brand === "string" && looksLikeColor(brand) ? brand : null;
		}

		//#region dsh-dream-skin: P0 favorites + surprise-me
		/** Read the favorites id list (built-in skins + imported pack ids). */
		function readFavorites() {
			const raw = readStorage(FAVORITES_KEY);
			if (raw === null) return [];
			try {
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
			} catch {
				return [];
			}
		}

		/** Persist the favorites list. */
		function writeFavorites(list) {
			writeStorage(FAVORITES_KEY, JSON.stringify(list));
		}

		/** Toggle a favorite id; returns true if it is now favorited. */
		function toggleFavorite(id) {
			const list = readFavorites();
			const idx = list.indexOf(id);
			if (idx === -1) {
				list.push(id);
				writeFavorites(list);
				return true;
			}
			list.splice(idx, 1);
			writeFavorites(list);
			return false;
		}

		/** All applyable theme ids (built-in skins + imported packs). */
		function allThemeIds() {
			const built = SKINS.map((s) => s.id);
			for (const p of importedPacks) if (p && p.id) built.push(p.id);
			return built;
		}

		/** Pick a different random theme id than the current one. */
		function randomThemeId(exclude) {
			const ids = allThemeIds().filter((id) => id !== exclude);
			if (ids.length === 0) return null;
			return ids[Math.floor(Math.random() * ids.length)];
		}
		//#endregion

		//#region dsh-dream-skin: P0 stores + module hooks
		/** Accent row slot store. */
		function createAccentStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ accent: DEFAULT_ACCENT, base: DEFAULT_ACCENT, revision: -1 }),
				actions: {
					sync: (d, accent, base, revision) => {
						if (revision <= d.revision) return;
						d.accent = accent;
						d.base = base;
						d.revision = revision;
					}
				}
			});
		}

		/** Pack library row slot store (ids + names + favorites + active + suggestion). */
		function createPackStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ ids: [], names: {}, favorites: [], active: null, suggestion: null, revision: -1 }),
				actions: {
					sync: (d, ids, names, favorites, active, suggestion, revision) => {
						if (revision <= d.revision) return;
						d.ids = ids;
						d.names = names;
						d.favorites = favorites;
						d.active = active;
						d.suggestion = suggestion;
						d.revision = revision;
					}
				}
			});
		}

		/** Suggested wallpaper gradient for a theme (P0-3 per-skin recommendation). */
		function wallpapersSuggestionsFor(activeId) {
			const suggestions = {
				abyss: "linear-gradient(135deg, #0b1120 0%, #172554 55%, #1e3a8a 100%)",
				aurora: "linear-gradient(135deg, #022c22 0%, #065f46 60%, #0d9488 100%)",
				nebula: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #7e22ce 100%)",
				ember: "linear-gradient(135deg, #251607 0%, #7c2d12 60%, #c2410c 100%)",
				midnight: "linear-gradient(135deg, #030712 0%, #0f172a 100%)",
				ivory: "linear-gradient(135deg, #faf5eb 0%, #e7dfcb 100%)",
				mist: "linear-gradient(135deg, #f0f3f7 0%, #dbe4ee 100%)",
				rose: "linear-gradient(135deg, #fdf2f6 0%, #f0d2dc 100%)"
			};
			return suggestions[activeId] || null;
		}

		/** Module-level hooks the PacksRow component uses to import/export/share. */
		let packsImportHandler = null;
		let packExporter = null;
		let packShare = null;

		/** Advanced wallpaper row store: kind + url + gradient + video + autodim. */
		function createAdvancedWallpaperStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ kind: "image", url: null, gradient: null, video: null, autodim: false, revision: -1 }),
				actions: {
					sync: (d, kind, url, gradient, video, autodim, revision) => {
						if (revision <= d.revision) return;
						d.kind = kind;
						d.url = url;
						d.gradient = gradient;
						d.video = video;
						d.autodim = autodim;
						d.revision = revision;
					}
				}
			});
		}
		//#endregion

		//#region dsh-dream-skin: P0 accent override
		/** Source identity for the per-user accent override layer. */
		const ACCENT_OVERRIDE_SOURCE = "dsh-dream-skin:accent";
		/** Token names the accent override shades (brand + primary surfaces). */
		const ACCENT_TOKENS = [
			"--dsw-alias-brand-primary",
			"--dsw-alias-state-business-primary",
			"--dsw-alias-button-primary-fill",
			"--dsw-alias-button-primary-dimmed"
		];
		/** Disposer for the active accent override layer. */
		let accentOverrideDispose = null;
		/** Cached accent currently applied (hex or null). */
		let appliedAccent = null;

		/**
		 * Read the persisted accent (`#rrggbb`, `${skinId}` to borrow a skin's
		 * accent, or `system` + null when unset).
		 */
		function readAccent() {
			const raw = readStorage(ACCENT_KEY);
			if (raw === null || raw === DEFAULT_ACCENT) return null;
			if (HEX_RE.test(raw.trim())) return raw.toLowerCase();
			const skin = SKINS.find((s) => s.id === raw.trim());
			return skin ? skin.tokens["--dsw-alias-brand-primary"] : null;
		}

		/** Apply (or clear) the accent override layer. Returns the accent used. */
		function applyAccent(ctx) {
			const accent = readAccent();
			if (accent === null) {
				accentOverrideDispose?.();
				accentOverrideDispose = null;
				appliedAccent = null;
				return null;
			}
			const pair = { light: accent, dark: accent };
			const overrides = {};
			for (const name of ACCENT_TOKENS) overrides[name] = pair;
			accentOverrideDispose?.();
			accentOverrideDispose = ctx.theme.overrideTokens(ACCENT_OVERRIDE_SOURCE, overrides);
			appliedAccent = accent;
			return accent;
		}

		/** Set (or clear with null) the accent override. */
		function setAccent(ctx, value) {
			writeStorage(ACCENT_KEY, value === null || value === DEFAULT_ACCENT ? null : String(value));
			return applyAccent(ctx);
		}
		//#endregion

		//#region dsh-dream-skin: P0 wallpaper 2.0 (url / gradient / auto-dim)
		/** Unique source identity for the wallpaper (already composited) layer. */
		const WALLPAPER_OVERRIDE_SOURCE = "dsh-dream-skin:wallpaper";
		/** Read wallpaper kind (image|url|gradient|video). */
		function readWallpaperKind() {
			const kind = readStorage(WALLPAPER_KIND_KEY);
			return kind === "url" || kind === "gradient" || kind === "video" ? kind : "image";
		}

		/** Read the persistable wallpaper URL string (for url kind). */
		function readWallpaperUrl() {
			const raw = readStorage(WALLPAPER_URL_KEY);
			return raw && raw.length > 4 ? raw : null;
		}

		/** Read the gradient CSS (for gradient kind). */
		function readWallpaperGradient() {
			const raw = readStorage(WALLPAPER_GRADIENT_KEY);
			return raw && raw.length > 4 ? raw : null;
		}

		/** Read the video wallpaper source (an http(s) URL or the IDB sentinel). */
		function readWallpaperVideo() {
			const raw = readStorage(WALLPAPER_VIDEO_KEY);
			return raw && raw.length > 4 ? raw : null;
		}

		/** Whether auto-dim wallpapers while a task is focused. */
		function readWallpaperAutodim() {
			return readStorage(WALLPAPER_AUTODIM_KEY) === "1";
		}

		/** Persist auto-dim. */
		function writeWallpaperAutodim(on) {
			writeStorage(WALLPAPER_AUTODIM_KEY, on ? "1" : "0");
		}

		/**
		 * Resolve the background-image CSS for the current wallpaper config, or
		 * null when no wallpaper is set.
		 */
		function wallpaperBackgroundCss() {
			const kind = readWallpaperKind();
			if (kind === "video") return null; // rendered as a <video> layer, not CSS
			if (kind === "gradient") {
				const grad = readWallpaperGradient();
				return grad ? grad : null;
			}
			if (kind === "url") {
				const url = readWallpaperUrl();
				return url ? `url("${url}")` : null;
			}
			// legacy / image
			const data = readWallpaper();
			return data ? `url("${data}")` : null;
		}

		/**
		 * Resolve the active wallpaper as a descriptor: {kind:"video", src} for
		 * video wallpapers, {kind, css} for CSS kinds, or null when none is set.
		 */
		function wallpaperDescriptor() {
			const kind = readWallpaperKind();
			if (kind === "video") {
				const src = readWallpaperVideo();
				return src ? { kind: "video", src } : null;
			}
			const css = wallpaperBackgroundCss();
			return css ? { kind, css } : null;
		}

		/** Whether any wallpaper (CSS or video) is currently configured. */
		function wallpaperActive() {
			return wallpaperDescriptor() !== null;
		}

		/** The fixed <video> backdrop layer for video wallpapers (lazily created). */
		let wallpaperVideoEl = null;
		/** Active object URL for an IndexedDB-backed video (revoked on replace/teardown). */
		let wallpaperVideoObjectUrl = null;
		/** Generation counter guarding async video-src resolution against races. */
		let videoLoadGen = 0;
		/** Locale-bound alert hook (assigned in apply()); default is a safe no-op. */
		let videoNotifier = () => {};

		/** Create (or reuse) the fixed muted looping <video> backdrop layer. */
		function ensureVideoLayer() {
			if (wallpaperVideoEl === null || !document.body.contains(wallpaperVideoEl)) {
				const el = document.createElement("video");
				el.style.cssText = "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;";
				el.setAttribute("playsinline", "");
				el.playsInline = true;
				el.muted = true;
				el.loop = true;
				el.autoplay = true;
				document.body.prepend(el);
				wallpaperVideoEl = el;
			}
			return wallpaperVideoEl;
		}

		/** Remove the video layer, revoke its object URL, and orphan pending loads. */
		function teardownVideoLayer() {
			videoLoadGen += 1;
			if (wallpaperVideoEl !== null) {
				try { wallpaperVideoEl.pause(); } catch {}
				wallpaperVideoEl.onerror = null;
				wallpaperVideoEl.remove();
				wallpaperVideoEl = null;
			}
			if (wallpaperVideoObjectUrl !== null) {
				try { URL.revokeObjectURL(wallpaperVideoObjectUrl); } catch {}
				wallpaperVideoObjectUrl = null;
			}
		}

		//#region dsh-dream-skin: video wallpaper storage (IndexedDB)
		/** Open (or create) the plugin's IndexedDB; resolves null when unavailable. */
		function idbOpen() {
			return new Promise((resolve) => {
				if (typeof indexedDB === "undefined") { resolve(null); return; }
				let req;
				try { req = indexedDB.open("dsh-dream-skin", 1); }
				catch { resolve(null); return; }
				req.onupgradeneeded = () => { try { req.result.createObjectStore("wallpapers"); } catch {} };
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => resolve(null);
				req.onblocked = () => resolve(null);
			});
		}

		/** Persist the local-video blob under the fixed key. Resolves true on success. */
		async function idbSaveVideo(blob) {
			const db = await idbOpen();
			if (db === null) return false;
			return await new Promise((resolve) => {
				let tx;
				try { tx = db.transaction("wallpapers", "readwrite"); }
				catch { resolve(false); return; }
				const put = tx.objectStore("wallpapers").put(blob, "video");
				put.onsuccess = () => resolve(true);
				put.onerror = () => resolve(false);
				tx.onabort = () => resolve(false);
			});
		}

		/** Load the local-video blob (null when absent or unavailable). */
		async function idbLoadVideo() {
			const db = await idbOpen();
			if (db === null) return null;
			return await new Promise((resolve) => {
				let get;
				try { get = db.transaction("wallpapers", "readonly").objectStore("wallpapers").get("video"); }
				catch { resolve(null); return; }
				get.onsuccess = () => resolve(get.result ?? null);
				get.onerror = () => resolve(null);
			});
		}

		/** Delete the stored local-video blob (never rejects). */
		async function idbClearVideo() {
			const db = await idbOpen();
			if (db === null) return;
			await new Promise((resolve) => {
				let del;
				try { del = db.transaction("wallpapers", "readwrite").objectStore("wallpapers").delete("video"); }
				catch { resolve(); return; }
				del.onsuccess = () => resolve();
				del.onerror = () => resolve();
			});
		}
		//#endregion

		/**
		 * Point the video layer at `src` (an http(s) URL or the IDB sentinel).
		 * The sentinel resolves asynchronously from IndexedDB; the generation
		 * counter discards stale resolutions, and a missing blob clears the
		 * dead wallpaper with a notice instead of a silent black screen.
		 */
		function applyVideoSource(src) {
			const el = ensureVideoLayer();
			const gen = ++videoLoadGen;
			el.onerror = () => {
				el.onerror = null;
				videoNotifier("bg2.videoFailed");
			};
			if (src !== IDB_VIDEO_REF) {
				el.src = src;
				try { const p = el.play(); if (p && typeof p.catch === "function") p.catch(() => {}); } catch {}
				return;
			}
			idbLoadVideo().then((blob) => {
				if (gen !== videoLoadGen) return; // a newer source/teardown won
				if (blob === null) {
					clearDeadVideoWallpaper();
					return;
				}
				if (wallpaperVideoObjectUrl !== null) {
					try { URL.revokeObjectURL(wallpaperVideoObjectUrl); } catch {}
				}
				wallpaperVideoObjectUrl = URL.createObjectURL(blob);
				el.src = wallpaperVideoObjectUrl;
				try { const p = el.play(); if (p && typeof p.catch === "function") p.catch(() => {}); } catch {}
			}).catch(() => {
				if (gen !== videoLoadGen) return;
				clearDeadVideoWallpaper();
			});
		}

		/** Guards against re-entrant wallp-paper re-shading (overrideTokens emits theme/change). */
		let _applyingWallpaper = false;

		/** Re-render the wallpaper backdrop from the current config. */
		function applyWallpaper2(ctx) {
			// Re-entrancy guard: overrideTokens() below emits `theme/change`, which our
			// syncSkin listener would answer by calling applyWallpaper2 again — that
			// recursion would overflow the stack. Applying while already applying is a
			// no-op; the first (outermost) call performs the shading.
			if (_applyingWallpaper) return;
			_applyingWallpaper = true;
			try {
				const wp = wallpaperDescriptor();
				if (wp === null) {
					teardownWallpaper();
					return;
				}
				const blur = readWallpaperBlur();
				if (wp.kind === "video") {
					// Video wallpapers render as a muted looping <video> layer;
					// drop the CSS div so the two never stack.
					wallpaperEl?.remove();
					wallpaperEl = null;
					const el = ensureVideoLayer();
					el.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
					applyVideoSource(wp.src);
				} else {
					// CSS kinds keep the fixed background-image div; drop any video layer.
					teardownVideoLayer();
					if (wallpaperEl === null || !document.body.contains(wallpaperEl)) {
						wallpaperEl = document.createElement("div");
						wallpaperEl.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;";
						document.body.prepend(wallpaperEl);
					}
					wallpaperEl.style.backgroundImage = wp.css;
					wallpaperEl.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
				}
				// Auto-dim lowers the wash opacity when enabled.
				const baseFill = readWallpaperOpacity();
				const wash = readWallpaperAutodim() ? Math.min(baseFill, 0.45) : baseFill;
				shadeTokens2(ctx, wash);
			} finally {
				_applyingWallpaper = false;
			}
		}

		/** Apply the wallpaper's token override layer with a configurable canvas wash. */
		function shadeTokens2(ctx, canvasAlpha) {
			const snapshot = ctx.theme.getTheme();
			const sidebarAlpha = readSidebarOpacity();
			const rightSidebarAlpha = readRightSidebarOpacity();
			const overrides = {
				"--dsw-alias-bg-base": {
					light: toRgba(resolveBase("light", snapshot.active), canvasAlpha),
					dark: toRgba(resolveBase("dark", snapshot.active), canvasAlpha)
				},
				"--dsw-specific-sidebar-fill": {
					light: toRgba(resolveSidebar("light", snapshot.active), sidebarAlpha),
					dark: toRgba(resolveSidebar("dark", snapshot.active), sidebarAlpha)
				},
				[RIGHT_SIDEBAR_FILL_TOKEN]: {
					light: toRgba(resolveLayer1("light", snapshot.active), rightSidebarAlpha),
					dark: toRgba(resolveLayer1("dark", snapshot.active), rightSidebarAlpha)
				},
				"--dsw-alias-bg-layer-1": {
					light: toRgba(resolveLayer1("light", snapshot.active), canvasAlpha),
					dark: toRgba(resolveLayer1("dark", snapshot.active), canvasAlpha)
				}
			};
			wallpaperOverrideDispose?.();
			wallpaperOverrideDispose = ctx.theme.overrideTokens(WALLPAPER_OVERRIDE_SOURCE, overrides);
			renderRightSidebarWash(ctx);
		}

		// Wallpaper store bookkeeping lives at module scope so the module-level
		// helpers below (removeWallpaper / setWallpaperKind) can refresh the row
		// store. They are bound by apply() via wallpaperBound; before then the
		// optional chain makes syncWallpaper a safe no-op.
		let wallpaperRevision = 0;
		let wallpaperBound = null;
		/** Push the persisted wallpaper state into the Wallpaper row store (if bound). */
		function syncWallpaper() {
			wallpaperRevision += 1;
			// Store the raw data URL (not the CSS url(...) wrapper) so the
			// Wallpaper row can render an <img> preview and test `url !== null`.
			wallpaperBound?.sync(
				readWallpaperKind() === "video" ? null : readWallpaper(),
				readWallpaperOpacity(),
				readWallpaperBlur(),
				readSidebarOpacity(),
				readRightSidebarOpacity(),
				readWallpaperHistory(),
				wallpaperRevision
			);
		}

		let advWallpaperBound = null;
		let advWallpaperRevision = 0;
		/** Push the persisted advanced-wallpaper state into the adv row store. */
		function syncAdvWallpaper() {
			advWallpaperRevision += 1;
			advWallpaperBound?.sync(
				readWallpaperKind(),
				readWallpaperUrl(),
				readWallpaperGradient(),
				readWallpaperVideo(),
				readWallpaperAutodim(),
				advWallpaperRevision
			);
		}

		/**
		 * A video wallpaper whose IDB blob vanished (cleared by "清除壁纸"):
		 * notify, clear the dead keys, tear everything down, refresh both rows.
		 */
		function clearDeadVideoWallpaper() {
			videoNotifier("bg2.videoRestoreFailed");
			writeStorage(WALLPAPER_VIDEO_KEY, null);
			writeStorage(WALLPAPER_KIND_KEY, null);
			teardownWallpaper();
			syncWallpaper();
			syncAdvWallpaper();
		}

		/** Clear wallpaper (all kinds, including the IDB video blob) and overrides. */
		function removeWallpaper(ctx) {
			writeStorage(WALLPAPER_KEY, null);
			writeStorage(WALLPAPER_URL_KEY, null);
			writeStorage(WALLPAPER_GRADIENT_KEY, null);
			writeStorage(WALLPAPER_VIDEO_KEY, null);
			writeStorage(WALLPAPER_KIND_KEY, null);
			idbClearVideo();
			teardownWallpaper();
			syncWallpaper();
			syncAdvWallpaper();
		}

		/** Read recent wallpaper history entries [{kind,value}]. */
		function readWallpaperHistory() {
			const raw = readStorage(WALLPAPER_HISTORY_KEY);
			if (raw === null) return [];
			try {
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.value === "string") : [];
			} catch {
				return [];
			}
		}

		/** Persist the wallpaper history list. */
		function writeWallpaperHistory(list) {
			writeStorage(WALLPAPER_HISTORY_KEY, JSON.stringify(list.slice(0, WALLPAPER_HISTORY_MAX)));
		}

		/** Record a wallpaper setting into history (dedupe by kind+value, newest first). */
		function pushWallpaperHistory(kind, value) {
			if (value === null || value === undefined || value === "") return;
			const list = readWallpaperHistory();
			const deduped = list.filter((e) => !(e.kind === kind && e.value === value));
			deduped.unshift({ kind, value });
			writeWallpaperHistory(deduped);
		}

		/** Set a wallpaper by kind and value. */
		function setWallpaperKind(ctx, kind, value) {
			writeStorage(WALLPAPER_KIND_KEY, kind);
			if (kind === "gradient") {
				writeStorage(WALLPAPER_GRADIENT_KEY, value);
			} else if (kind === "url") {
				writeStorage(WALLPAPER_URL_KEY, value);
			} else if (kind === "video") {
				writeStorage(WALLPAPER_VIDEO_KEY, value);
			} else {
				writeStorage(WALLPAPER_KEY, value);
			}
			pushWallpaperHistory(kind, value);
			applyWallpaper2(ctx);
			syncWallpaper();
		}
		//#endregion

		//#region dsh-dream-skin: P0 share-url import
		/** Try to import a pack shared via URL hash; true when one was imported. */
		function tryImportFromHash(ctx) {
			const decoded = decodeShareUrl(window.location.hash);
			if (!decoded) return false;
			try {
				// A pack id already in the local library wins: do NOT let a share link
				// silently overwrite the registration (the library card would then show
				// the old manifest while the runtime uses the new tokens). Keep the
				// existing pack and just record the visit.
				const exists = importedPacks.some((p) => p && p.id === decoded.id);
				if (!exists) {
					applyPackToTheme(ctx, decoded.id, packToRegistration(decoded.pack));
					importedPacks.push({ id: decoded.id, manifest: decoded.pack.manifest, registration: packToRegistration(decoded.pack) });
				}
				const packs = readPacks();
				if (!packs.some((p) => p.id === decoded.id)) packs.push({ id: decoded.id, manifest: decoded.pack.manifest });
				writePacks(packs);
			} catch {
				// A bad import at boot must NOT consume the share link: keep the hash
				// so the user can retry (or notice the failure) on the next load.
				return false;
			}
			// Clear the hash so it doesn't re-import on every reload.
			try {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			} catch {
				// no-op
			}
			return true;
		}
		//#endregion

		//#endregion

		//#region dsh-dream-skin: P0 UI rows (accent + packs)
		/** Curated accent presets users can pick with one click. */
		const ACCENT_PRESETS = [
			"#4f83f2", "#2563eb", "#34d399", "#22d3ee", "#a78bfa",
			"#fb923c", "#f87171", "#fbbf24", "#e879f9", "#f472b6",
			"#2dd4bf", "#a3e635"
		];

		/**
		 * Accent row: pick an arbitrary brand-accent color (or clear to follow
		 * the active theme). Uses an `<input type="color">` + the current accent
		 * preview swatch, stacked as an override layer via ctx.theme.
		 */
		function AccentRow({ t, setAccent, clearAccent, useStore }) {
			const accent = useStore((s) => s.accent);
			const base = useStore((s) => s.base);
			const activeValue = accent !== DEFAULT_ACCENT ? accent : base;
			const inputValue = normalizeHex(activeValue) || "#4f83f2";
			const accentPickerRef = (0, _react.useRef)(null);
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("accent.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								style: { ...styles.accentDot, background: inputValue },
								children: null
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: styles.accentHex,
								children: inputValue
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => {
									if (accentPickerRef.current) accentPickerRef.current.click();
								},
								children: t("accent.pick")
							}),
							(0, react_jsx_runtime.jsx)("input", {
								ref: accentPickerRef,
								type: "color",
								value: inputValue,
								style: { display: "none" },
								onChange: (event) => setAccent(event.target.value)
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => {
									const next = randomAccent();
									setAccent(next);
								},
								children: t("accent.random")
							}),
							accent !== DEFAULT_ACCENT ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: { ...styles.button, ...styles.buttonDanger },
								onClick: clearAccent,
								children: t("accent.clear")
							}) : null
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: ACCENT_PRESETS.map((hex) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							title: hex,
							"aria-pressed": activeValue === hex,
							style: {
								...styles.accentPreset,
								background: hex,
								...(activeValue === hex ? { outline: "2px solid var(--dsw-alias-label-primary)", outlineOffset: "1px" } : {})
							},
							onClick: () => setAccent(hex),
							children: null
						}, hex))
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.hint,
						children: t("accent.hint")
					})
				]
			});
		}

		/** Pick a pleasant palette accent that differs from the current one. */
		function randomAccent() {
			const pool = ["#4f83f2", "#34d399", "#a78bfa", "#fb923c", "#f87171", "#22d3ee", "#fbbf24", "#e879f9", "#2dd4bf", "#f472b6", "#60a5fa", "#a3e635"];
			const current = readAccent();
			const candidates = pool.filter((c) => c !== current);
			return candidates[Math.floor(Math.random() * candidates.length)] || "#4f83f2";
		}

		/**
		 * Packs row: import a theme-pack JSON, apply / favorite themes in the
		 * library, export/share the current pack, and "surprise me".
		 */
		function PacksRow({ t, applyId, toggleFavorite, removePack, surprise, useStore }) {
			const ids = useStore((s) => s.ids);
			const names = useStore((s) => s.names);
			const favorites = useStore((s) => s.favorites);
			const active = useStore((s) => s.active);
			const fileInput = (0, _react.useRef)(null);
			const importFile = () => { if (fileInput.current) fileInput.current.click(); };

			const onFile = (event) => {
				const file = event.target.files?.[0];
				if (file === void 0) return;
				if (file.size > PACK_MAX_BYTES) {
					event.target.value = "";
					return;
				}
				const reader = new FileReader();
				reader.onerror = () => {
					event.target.value = "";
				};
				reader.onload = () => {
					let data = null;
					try {
						data = JSON.parse(String(reader.result));
					} catch {
						data = null;
					}
					if (data !== null && packsImportHandler) {
						packsImportHandler(null, data); // handler wraps validatePack + importPack
					}
					event.target.value = "";
				};
				reader.readAsText(file);
			};

			const doShare = () => {
				const activeId = active && ids.indexOf(active) !== -1 ? active : null;
				if (activeId && packShare) {
					const url = packShare(activeId);
					if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(url).then(() => {}).catch(() => {});
				}
			};

			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("packs.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: importFile,
								children: t("packs.import")
							}),
							(0, react_jsx_runtime.jsx)("input", {
								ref: fileInput,
								type: "file",
								accept: ".json,.dsh-theme.json,.dsh-theme,application/json",
								style: { display: "none" },
								onChange: onFile
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => surprise(),
								children: t("packs.surprise")
							}),
							active && packShare ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: doShare,
								children: t("packs.share")
							}) : null
						]
					}),
					ids.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.grid,
						children: ids.map((id) => {
							const fav = favorites.indexOf(id) !== -1;
							const label = names[id] || id;
							return (0, react_jsx_runtime.jsxs)("button", {
								key: id,
								type: "button",
								"aria-pressed": active === id,
								style: {
									...styles.card,
									...(active === id ? styles.cardSelected : {})
								},
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										style: styles.cardLabel,
										children: label
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										style: styles.actionRow,
										children: [
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: { ...styles.tinyButton },
												onClick: () => applyId(id),
												children: t("packs.apply")
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: { ...styles.tinyButton, ...(fav ? styles.tinyButtonActive : {}) },
												onClick: () => toggleFavorite(id),
												children: fav ? "★" : "☆"
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: { ...styles.tinyButton, ...styles.buttonDanger },
												onClick: () => removePack(id),
												children: t("packs.remove")
											})
										]
									})
								]
							});
						})
					}) : (0, react_jsx_runtime.jsx)("div", {
						style: styles.hint,
						children: t("packs.empty")
					})
				]
			});
		}
		//#endregion

		//#region dsh-dream-skin: Appearance settings section
		/**
		 * A dedicated "Theme / 外观" settings section. Hosts the skin, wallpaper,
		 * advanced wallpaper, accent and theme-pack rows — instead of flat rows in
		 * the General section, they live under their own category in the settings
		 * left nav.
		 */
		function DreamSkinSection({ renderSlot }) {
			return (0, react_jsx_runtime.jsx)("div", {
				style: styles.section,
				children: renderSlot("settings.dreamSkin.item", {})
			});
		}
		//#endregion
		//#region dsh-dream-skin: client plugin body
		/**
		 * Required services: theme runtime (skins, switching, token override
		 * layers) and slots/locale (the settings rows). The boot-adoption guard
		 * watches the theme runtime's own ui-theme settings scope (`ctx.theme.host`),
		 * so no settings transport of our own is needed. Persistence stays in
		 * localStorage — no settings writes.
		 */
		const inject = [
			"slots",
			"locale",
			"theme"
		];

		/**
		 * Client plugin body: register the curated skins into the theme runtime,
		 * restore the saved skin and wallpaper, keep the rows' stores in sync
		 * with theme/change, and register both rows into Settings → General.
		 * @param ctx - client cordis context.
		 */
		/** Deterministic boot-race debug hook (dev only; exposed on window). */
		const __dssDebug = { applies: 0, events: [], scope: void 0, scopeRev: void 0, current: void 0, themes: [] };
		try { window.__dssDebug = __dssDebug; } catch {}
		let __dssApplyCount = 0;
		function apply(ctx) {
			__dssApplyCount += 1;
			__dssDebug.applies = __dssApplyCount;
			__dssDebug.themes = ctx.theme.getTheme().themes.map((t) => t.id);
			ctx.on("theme/change", (snapshot) => {
				__dssDebug.current = snapshot.preference;
				__dssDebug.events.push({ t: "pref", current: snapshot.preference });
			});
			__dssDebug.events.push({ t: "apply", n: __dssApplyCount });			const disposers = SKINS.map((skinDefinition) => ctx.theme.register(skinDefinition));
			ctx.effect(() => () => {
				for (const dispose of disposers) dispose();
			}, "dsh-dream-skin: theme registration");

			// P0: re-register previously imported packs before restoring a skin,
			// then import any pack shared via URL hash.
			restorePacks(ctx);
			let importedPackShare = tryImportFromHash(ctx);

			// Restore the saved skin once (before any user interaction).
			const saved = readSavedSkin();
			__dssDebug.events.push({ t: "restore", saved, current: ctx.theme.getTheme().preference });
			if (typeof saved === "string" && saved !== DEFAULT_SKIN && (SKINS.some((skinDefinition) => skinDefinition.id === saved) || importedPacks.some((p) => p.id === saved))) {
				const current = ctx.theme.getTheme().preference;
				if (current !== saved) ctx.theme.setTheme(saved);
			}
			/**
			 * The host ui-theme section only persists system/light/dark and is
			 * adopted asynchronously after load. Each adoption re-applies the
			 * persisted built-in preference — and it lands TWICE per page load
			 * (the binder's initial describe plus the `connection/reset` refresh
			 * that fires on every connect) — so a third-party skin restored above
			 * is clobbered back to the built-in preference after the first adopt
			 * re-assert, and a one-shot re-assert can never win the race.
			 *
			 * Fix: watch the theme runtime's OWN settings scope (`ctx.theme.host`
			 * — the very store `adopt()` reads from, so the watcher is lockstep
			 * with every adoption). The re-assert handler distinguishes an
			 * ADOPTION (the store just accepted a host read — a NEW snapshot
			 * reference the watcher has not seen yet, and the forced preference
			 * equals the section value) from a DELIBERATE built-in write (the
			 * snapshot reference is unchanged at publish time, because the
			 * Appearance row's write lands afterwards), and only fights
			 * adoptions — as many times as they come. A deliberate write instead
			 * clears the saved skin so the built-in choice sticks.
			 */
			const BUILTIN_THEME_PREFERENCES = ["system", "light", "dark"];
			/** The theme runtime's own ui-theme settings scope (null when unavailable). */
			let themeSectionScope = null;
			/** Last snapshot reference observed by the watcher — "did the store just update?". */
			let themeSectionSnapshot = null;
			/** Last observed built-in preference from the host section. */
			let themeSectionPref = void 0;
			if (typeof ctx.theme?.host?.getSnapshot === "function" && typeof ctx.theme.host?.subscribe === "function") {
				themeSectionScope = ctx.theme.host;
				themeSectionSnapshot = themeSectionScope.getSnapshot();
				const initialSection = themeSectionSnapshot.value;
				themeSectionPref = typeof initialSection === "object" && initialSection !== null ? initialSection.preference : void 0;
				__dssDebug.events.push({ t: "bind", value: initialSection, rev: themeSectionSnapshot.revision });
				ctx.effect(() => {
					const dispose = themeSectionScope.subscribe(() => {
						themeSectionSnapshot = themeSectionScope.getSnapshot();
						__dssDebug.scope = themeSectionSnapshot.value;
						__dssDebug.scopeRev = themeSectionSnapshot.revision;
						const section = themeSectionSnapshot.value;
						const pref = typeof section === "object" && section !== null ? section.preference : void 0;
						__dssDebug.events.push({ t: "section", pref, rev: themeSectionSnapshot.revision });
						if (typeof pref === "string" && typeof themeSectionPref === "string" && pref !== themeSectionPref) {
							// The persisted built-in preference changed — a deliberate
							// host write (built-in Appearance row) or a remote change.
							// It supersedes the saved dream skin.
							writeSavedSkin(DEFAULT_SKIN);
						}
						themeSectionPref = pref;
					});
					return dispose;
				}, "dsh-dream-skin: ui-theme section watcher");
			}
			/** Fallback for hosts without a settings transport: the old one-shot re-assert. */
			let reassertSkin = false;
			ctx.on("theme/change", () => {
				const savedSkin = readSavedSkin();
				if (typeof savedSkin !== "string" || savedSkin === DEFAULT_SKIN) return;
				const current = ctx.theme.getTheme().preference;
				if (current === savedSkin || !BUILTIN_THEME_PREFERENCES.includes(current)) return;
				const known = SKINS.some((skinDefinition) => skinDefinition.id === savedSkin) || importedPacks.some((p) => p.id === savedSkin);
				if (!known) return;
				if (themeSectionScope === null) {
					if (reassertSkin) return;
					reassertSkin = true;
					ctx.theme.setTheme(savedSkin);
					return;
				}
				const sectionSnapshot = themeSectionScope.getSnapshot();
				const section = sectionSnapshot.value;
				const sectionPref = typeof section === "object" && section !== null ? section.preference : void 0;
				__dssDebug.events.push({ t: "change", current, savedSkin, sectionPref, scope: section });
				if (current !== sectionPref) return;
				if (sectionSnapshot === themeSectionSnapshot) {
					// The section did not just update: this built-in preference was
					// picked deliberately (built-in Appearance row, or 默认 here).
					// It supersedes the saved dream skin.
					__dssDebug.events.push({ t: "clear-user-write", current, savedSkin });
					writeSavedSkin(DEFAULT_SKIN);
					return;
				}
				// The section store just accepted a host read — an adoption reset.
				// Re-assert the saved skin; sticky, so the second adoption is
				// beaten too.
				__dssDebug.events.push({ t: "reassert", current, savedSkin });
				ctx.theme.setTheme(savedSkin);
				// Probe: did the presenter apply the re-asserted snapshot synchronously?
				try {
					__dssDebug.events.push({
						t: "dom-probe",
						bgBase: document.body.style.getPropertyValue("--dsw-alias-bg-base"),
						dark: document.body.hasAttribute("data-ds-dark-theme"),
						colorScheme: document.documentElement.style.colorScheme
					});
				} catch {};
			});
			// P0: apply the persisted per-user accent override.
			applyAccent(ctx);

			// DFL brand logo override: swap the sidebar DSH whale mark for the
			// animated personal brand mark (see applyBrandLogo above).
			applyBrandLogo(ctx);

			// Wallpaper bookkeeping. The store revision counter and the sync
			// function live at module scope (see above) so module-level helpers
			// (removeWallpaper / setWallpaperKind) can refresh the row store too;
			// here we only create the store and apply the persisted wallpaper.
			const wallpaperStore = createWallpaperStore();
			applyWallpaper2(ctx);
			syncWallpaper();
			ctx.effect(() => () => {
				teardownWallpaper();
				disposeAllPacks();
			}, "dsh-dream-skin: wallpaper + packs cleanup");

			const skinStore = createSkinStore();
			let skinBound;
			// Monotonic revision for the skin slot store. Using a locally incrementing
			// counter (instead of the host theme revision) guarantees the store ALWAYS
			// updates on every click — even if theme/change timing races or the host
			// revision doesn't bump as expected — so the selected card follows instantly.
			let skinRevision = 0;
			const syncSkinWith = (id) => {
				skinBound?.sync(id, ++skinRevision);
				// A skin/scheme switch changes the base color; re-shade the wash.
				if (wallpaperActive()) applyWallpaper2(ctx);
			};
			const syncSkin = (snapshot) => {
				skinBound?.sync(snapshot.preference, ++skinRevision);
				// A skin/scheme switch changes the base color; re-shade the wash.
				if (wallpaperActive()) applyWallpaper2(ctx);
			};
			ctx.on("theme/change", syncSkin);
			// Keep the Accent row's base color (the active theme's brand color) in
			// sync when the skin/scheme changes — otherwise a row with no custom
			// accent keeps showing the PREVIOUS skin's brand color until remount.
			ctx.on("theme/change", (snapshot) => {
				accentBound?.sync(
					readAccent() || DEFAULT_ACCENT,
					resolveAccent(snapshot) || DEFAULT_ACCENT,
					++accentRevision
				);
			});

			ctx.effect(() => ctx.locale.register(SETTINGS_NS, {
				zh,
				en
			}), "dsh-dream-skin: settings row dictionaries");

			// Bound translator for non-React code paths (import/remove alerts), so
			// user-facing messages follow the active locale instead of hardcoded text.
			// Fall back to an identity translator when the locale service has no
			// bind() (or registered dictionaries arrive later) — alerts must never
			// take the whole settings section down.
			const localeT = typeof ctx.locale?.bind === "function"
				? ctx.locale.bind(SETTINGS_NS)
				: (key, params) => (params ? key : key);

			// Bind the video-wallpaper alert hook to the active locale.
			videoNotifier = (key) => { try { window.alert(localeT(key)); } catch {} };

			const skinInjected = (actions) => {
				skinBound = actions;
				syncSkin(ctx.theme.getTheme());
				return {
					setSkin: (id) => {
						ctx.theme.setTheme(id);
						writeSavedSkin(id);
						// Deterministically push the new preference into the slot store AND
						// re-shade the wallpaper so the selected card follows immediately,
						// independent of theme/change emission timing.
						syncSkinWith(id);
					}
				};
			};
			// Register our own "Theme / 外观" settings section. It appears in the
			// settings left-nav and hosts all skin features (skin, wallpaper,
			// advanced wallpaper, accent, theme packs) under a single category.
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dream-skin",
				order: 10,
				label: "Theme / 外观",
				locale: SETTINGS_NS,
				children: { "settings.dreamSkin.item": {
					kind: "list",
					scope: "root"
				} }
			}, DreamSkinSection));

			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin",
				order: 20,
				store: skinStore,
				locale: SETTINGS_NS,
				inject: skinInjected
			}, SkinRow));

			const wallpaperInjected = (actions) => {
				wallpaperBound = actions;
				syncWallpaper();
				return {
					setWallpaper: (url) => {
						// A locally picked image switches the wallpaper back to the image
						// kind — otherwise a previously set gradient/URL would keep
						// winning in wallpaperBackgroundCss() and the preview would lie.
						writeStorage(WALLPAPER_KIND_KEY, "image");
						writeStorage(WALLPAPER_KEY, url);
						pushWallpaperHistory("image", url);
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setWallpaperUrl: (url) => {
						setWallpaperKind(ctx, "url", url && url.length > 4 ? url : null);
					},
					setWallpaperGradient: (gradient) => {
						setWallpaperKind(ctx, "gradient", gradient && gradient.length > 4 ? gradient : null);
					},
					setWallpaperKind,
					setOpacity: (percent) => {
						const value = Math.min(1, Math.max(0, percent / 100));
						writeStorage(WALLPAPER_OPACITY_KEY, String(value));
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setSidebarOpacity: (percent) => {
						const value = Math.min(1, Math.max(0, percent / 100));
						writeStorage(SIDEBAR_OPACITY_KEY, String(value));
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setRightSidebarOpacity: (percent) => {
						const value = Math.min(1, Math.max(0, percent / 100));
						writeStorage(RIGHT_SIDEBAR_OPACITY_KEY, String(value));
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setBlur: (px) => {
						const value = Math.min(60, Math.max(0, px));
						writeStorage(WALLPAPER_BLUR_KEY, String(value));
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setAutodim: (on) => {
						writeWallpaperAutodim(!!on);
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					applyFromHistory: (kind, value) => {
						const resolvedKind = kind === "gradient" || kind === "url" || kind === "video" ? kind : "image";
						if (value && value.length > 4) {
							setWallpaperKind(ctx, resolvedKind, value);
						} else {
							syncWallpaper();
						}
					},
					clearWallpaper: () => {
						removeWallpaper(ctx);
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-wallpaper",
				order: 30,
				store: wallpaperStore,
				locale: SETTINGS_NS,
				inject: wallpaperInjected
			}, WallpaperRow));

			// P0: advanced wallpaper row (kind url / gradient / video / autodim).
			// advWallpaperBound / syncAdvWallpaper live at module scope so
			// module-level helpers (clearDeadVideoWallpaper / removeWallpaper)
			// can refresh this row too.
			const advWallpaperStore = createAdvancedWallpaperStore();
			const advWallpaperInjected = (actions) => {
				advWallpaperBound = actions;
				syncAdvWallpaper();
				return {
					setKind: (kind) => {
						if (kind !== "image" && kind !== "url" && kind !== "gradient" && kind !== "video") return;
						writeStorage(WALLPAPER_KIND_KEY, kind);
						applyWallpaper2(ctx);
						syncAdvWallpaper();
					},
					setUrl: (url) => {
						setWallpaperKind(ctx, "url", url && url.length > 4 ? url : null);
						syncAdvWallpaper();
					},
					setGradient: (gradient) => {
						setWallpaperKind(ctx, "gradient", gradient && gradient.length > 4 ? gradient : null);
						syncAdvWallpaper();
					},
					setVideo: (url) => {
						setWallpaperKind(ctx, "video", url && url.length > 4 ? url : null);
						syncAdvWallpaper();
					},
					setVideoFile: (file) => {
						if (file === void 0 || file === null) return Promise.resolve(false);
						return idbSaveVideo(file).then((ok) => {
							if (!ok) {
								videoNotifier("bg2.videoSaveFailed");
								return false;
							}
							setWallpaperKind(ctx, "video", IDB_VIDEO_REF);
							syncAdvWallpaper();
							return true;
						});
					},
					setAutodim: (on) => {
						writeWallpaperAutodim(!!on);
						applyWallpaper2(ctx);
						syncAdvWallpaper();
					},
					clearAll: () => {
						removeWallpaper(ctx);
						syncAdvWallpaper();
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-wallpaper-advanced",
				order: 31,
				store: advWallpaperStore,
				locale: SETTINGS_NS,
				inject: advWallpaperInjected
			}, WallpaperAdvancedRow));

			// P0: per-user accent override row.
			const accentStore = createAccentStore();
			let accentBound;
			let accentRevision = 0;
			const accentInjected = (actions) => {
				accentBound = actions;
				const base = resolveAccent(ctx.theme.getTheme()) || DEFAULT_ACCENT;
				// First sync must pass the store guard (`revision <= d.revision` rejects
				// when init revision is -1), so use the same monotonic counter as the
				// user actions — otherwise a saved accent never reaches the row UI on reload.
				accentBound?.sync(readAccent() || DEFAULT_ACCENT, base, ++accentRevision);
				return {
					setAccent: (value) => {
						const applied = setAccent(ctx, value === DEFAULT_ACCENT ? null : value);
						accentBound?.sync(
							applied || DEFAULT_ACCENT,
							resolveAccent(ctx.theme.getTheme()) || DEFAULT_ACCENT,
							++accentRevision
						);
					},
					clearAccent: () => {
						setAccent(ctx, null);
						accentBound?.sync(
							DEFAULT_ACCENT,
							resolveAccent(ctx.theme.getTheme()) || DEFAULT_ACCENT,
							++accentRevision
						);
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-accent",
				order: 25,
				store: accentStore,
				locale: SETTINGS_NS,
				inject: accentInjected
			}, AccentRow));

			// P0: theme-pack library + favorites + surprise-me row.
			const packStore = createPackStore();
			let packBound;
			let packRevision = 0;
			const syncPack = () => {
				const current = ctx.theme.getTheme().preference;
				// Carry a name lookup so the pack library renders manifest.name instead
				// of the raw `dream-pack:` id on each card.
				const names = {};
				for (const p of importedPacks) if (p && p.id) names[p.id] = p.manifest?.name || p.id;
				packBound?.sync(importedPacks.map((p) => p.id), names, readFavorites(), current, wallpapersSuggestionsFor(current), ++packRevision);
			};
			const refreshSurprise = () => {
				const id = randomThemeId(ctx.theme.getTheme().preference);
				if (id !== null) {
					ctx.theme.setTheme(id);
					writeSavedSkin(id);
				}
				syncPack();
				syncSkin(ctx.theme.getTheme());
			};
			const packInjected = (actions) => {
				packBound = actions;
				syncPack();
				return {
					applyId: (id) => {
						ctx.theme.setTheme(id);
						writeSavedSkin(id);
						syncPack();
						syncSkin(ctx.theme.getTheme());
					},
					toggleFavorite: (id) => {
						toggleFavorite(id);
						syncPack();
					},
					removePack: (id) => {
						const name = unimportPack(ctx, id);
						syncPack();
						syncSkin(ctx.theme.getTheme());
						if (name) { try { window.alert(localeT("packs.removed", { name })); } catch {} }
					},
					surprise: refreshSurprise
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-packs",
				order: 40,
				store: packStore,
				locale: SETTINGS_NS,
				inject: packInjected
			}, PacksRow));

			// Wire the shared "import a file" handler exposed to PacksRow via a
			// small module-level hook (the file input lives in the row component).
			packsImportHandler = (_ignoredCtx, data) => {
				const validate = (typeof data === "object" && data !== null) ? validatePack(data) : { ok: false, errors: ["invalid JSON or empty pack"] };
				if (!validate.ok) {
					try { window.alert(localeT("packs.rejected", { errors: (validate.errors || []).join("\n") })); } catch {}
					return { ok: false };
				}
				const result = importPack(ctx, validate);
				try {
					if (!result.ok) window.alert(localeT("packs.importFailed", { error: result.error }));
					else { syncPack(); window.alert(localeT("packs.imported", { name: result.name })); }
				} catch {}
				return result;
			};
			packExporter = (id) => exportPackAsFile(ctx, id);
			packShare = (id) => packShareUrl(id);
		}
		//#endregion

		exports.SETTINGS_NS = SETTINGS_NS;
		exports.SKINS = SKINS;
		exports.DEFAULT_SKIN = DEFAULT_SKIN;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
