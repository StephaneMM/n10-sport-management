import { z } from 'zod';

/** True only for http:// and https:// URLs. */
export function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * True when the URL's host is one of `domains` or a subdomain of one. Works on
 * the parsed hostname, so `evil-youtube.com`, `youtube.com.evil.com`,
 * `x@evil.com` and `?u=youtube.com` are all rejected.
 */
export function hostMatches(value: string, domains: readonly string[]): boolean {
  try {
    const { hostname } = new URL(value);
    return domains.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

/**
 * A URL the app stores and may later render as a link. Restricted to http(s) so
 * a stored `javascript:` / `data:` / `vbscript:` URL can never execute as script
 * in an admin's browser (`z.string().url()` alone accepts all of those).
 */
export const httpUrl = z
  .string()
  .url('Must be a valid URL')
  .max(500, 'URL is too long')
  .refine(isHttpUrl, 'Only http(s) links are allowed');

/** `httpUrl` further restricted to a host allowlist. */
export function httpUrlFrom(domains: readonly string[], message: string) {
  return httpUrl.refine((value) => hostMatches(value, domains), message);
}
