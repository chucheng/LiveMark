import { tabsState } from "@/state/tabs";
import { openFileInTab } from "@/commands/file-commands";
import { open } from "@tauri-apps/plugin-shell";

/** URL schemes that must never be opened. */
export const DANGEROUS_SCHEMES = /^(javascript|data|vbscript):/i;

/**
 * Schemes that should be handled by the OS (browser, mail client, etc.),
 * not treated as local file paths. Matches `scheme:` with no `://` required,
 * covering mailto:, tel:, sms:, slack:, steam:, etc.
 */
const KNOWN_SCHEMES = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Returns true if the href looks like a local file path rather than
 * an external URL or special scheme.
 *
 * A link is local if it:
 * - Is non-empty
 * - Is not an anchor-only link (#...)
 * - Has no URL scheme (http:, mailto:, tel:, etc.)
 * - Is not a protocol-relative URL (//...)
 */
export function isLocalFile(href: string): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return false;
  if (trimmed.startsWith("//")) return false;
  if (DANGEROUS_SCHEMES.test(trimmed)) return false;
  if (KNOWN_SCHEMES.test(trimmed)) return false;
  return true;
}

/**
 * Resolve a relative href against a base file path.
 *
 * - Strips query string and fragment from the href
 * - Decodes percent-encoded characters (e.g. %20 → space)
 * - Handles `..` traversal (cannot escape root)
 * - Absolute hrefs (starting with `/`) are returned as-is
 */
export function resolveRelativePath(base: string, href: string): string {
  // Strip query/fragment for file resolution
  let cleanHref = href.split(/[?#]/)[0];

  // Decode percent-encoded characters (e.g. %20 → space)
  try {
    cleanHref = decodeURIComponent(cleanHref);
  } catch {
    // If decoding fails (malformed %), use as-is
  }

  if (!cleanHref) return base;

  if (cleanHref.startsWith("/")) return cleanHref;

  const dir = base.substring(0, base.lastIndexOf("/"));
  const parts = (dir + "/" + cleanHref).split("/");
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === "..") {
      if (resolved.length > 0) resolved.pop();
    } else if (p !== "." && p !== "") {
      resolved.push(p);
    }
  }
  return "/" + resolved.join("/");
}

/**
 * Smart open: local file links open in a tab, external URLs open in the browser.
 * Returns true if the link was handled (caller should not take further action).
 */
export function smartOpenLink(href: string): boolean {
  if (!href) return false;
  if (DANGEROUS_SCHEMES.test(href.trim())) return true; // block silently

  if (isLocalFile(href)) {
    const currentPath = tabsState.filePath();
    if (currentPath) {
      const resolved = resolveRelativePath(currentPath, href);
      openFileInTab(resolved);
      return true;
    }
  }

  // External URL or no current file — open in browser/OS handler
  open(href).catch(() => {});
  return true;
}
