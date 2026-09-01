/**
 * Returns the value only when it is an http(s) URL, otherwise `undefined`.
 *
 * Use it before putting any stored, user-originated string into an `href`. A
 * `javascript:` / `data:` URL that reached the database before server-side
 * validation existed would otherwise execute when an admin clicks the link.
 */
export function safeExternalUrl(value: string): string | undefined {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}
