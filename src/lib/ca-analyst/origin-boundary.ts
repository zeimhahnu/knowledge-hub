export const DIRECT_PRODUCTION_ORIGIN = "corporate-action.vercel.app";

export type OriginAccessMode = "pre-activation" | "enforce" | "invalid";
export type OriginBoundaryDecision = "allow-certificate" | "verify" | "deny";

export function originAccessMode(env: NodeJS.ProcessEnv = process.env): OriginAccessMode {
  const value = env.CA_ACCESS_ORIGIN_A_MODE?.trim().toLowerCase() || "pre-activation";
  if (value === "pre-activation" || value === "enforce") return value;
  return "invalid";
}

export function isCertificateValidationPath(pathname: string): boolean {
  return pathname.startsWith("/.well-known/acme-challenge/") || pathname.startsWith("/.well-known/vercel/");
}

/**
 * Returns true only for the two certificate-validation paths documented for
 * the pre-activation window. No host header is consulted here.
 */
export function allowsOriginBoundaryRequest(pathname: string, mode: OriginAccessMode): boolean {
  return mode === "pre-activation" && isCertificateValidationPath(pathname);
}

export function originBoundaryDecision(pathname: string, mode: OriginAccessMode): OriginBoundaryDecision {
  if (allowsOriginBoundaryRequest(pathname, mode)) return "allow-certificate";
  if (mode === "enforce") return "verify";
  return "deny";
}
