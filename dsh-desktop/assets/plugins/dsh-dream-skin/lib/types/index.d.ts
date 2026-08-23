/**
 * Host-side type declarations for `dsh-dream-skin`.
 *
 * The host half is a no-op loader entry — see {@link apply}. All feature
 * behavior lives in the browser half (`./client`).
 */

/** Token-name → concrete CSS color for a registered theme (scalar per scheme). */
export interface SkinTokens {
  [name: string]: string;
}

/** A curated skin: an immutable third-party theme definition. */
export interface DreamSkin {
  /** Unique theme id (registered into ThemeRuntime; `"system"` is reserved). */
  id: string;
  /** Base palette this skin builds on; drives `body[data-ds-dark-theme]`. */
  colorScheme: "light" | "dark";
  /** `--dsw-alias-*` token overrides (and component-specific tokens). */
  tokens: SkinTokens;
}

/**
 * Host loader entry. A no-op: the patch layer (cordis.patch.yml) inserts the
 * `dream-skin` row and dsh-client-modules picks up the browser half through
 * the package's `dsh.client` declaration, exactly like the shipped ui-*
 * packages.
 */
export function apply(ctx?: unknown): void;
