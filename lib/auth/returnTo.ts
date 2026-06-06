// Helpers for carrying an intended destination (and any marketplace filter
// query it contains) safely through the auth flow.
//
// SECURITY: only same-origin relative paths are allowed, so a crafted
// `?returnTo=https://evil.example` can never turn the login/signup redirect
// into an open redirect.

export const returnToParam = "returnTo";

export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  // Must be a same-origin absolute path ("/...") and not a protocol-relative
  // ("//host") or backslash-trick URL.
  if (!value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }

  return value;
}

/** Append a sanitized returnTo to an auth route, e.g. withReturnTo("/login", to). */
export function withReturnTo(base: string, returnTo: string | null | undefined): string {
  const safe = sanitizeReturnTo(returnTo);
  return safe ? `${base}?${returnToParam}=${encodeURIComponent(safe)}` : base;
}

/** Read the returnTo from a URLSearchParams-like object and sanitize it. */
export function readReturnTo(params: { get: (key: string) => string | null }): string | null {
  return sanitizeReturnTo(params.get(returnToParam));
}
