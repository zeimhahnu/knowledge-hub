# P1a origin-A boundary

The Hub has two origin paths: the Access-protected custom hostname and the direct Vercel production hostname (`corporate-action.vercel.app`). The Next middleware must protect the application at origin A as well as the `/api/ca-analyst/*` relay.

## Configuration gate

`CA_ACCESS_ORIGIN_A_MODE` is the deliberate deployment gate:

- `pre-activation` (default when unset): only `/.well-known/acme-challenge/*` and `/.well-known/vercel/*` are reachable for certificate/domain verification. All other matched Hub routes return 403. This is the safe state before the custom hostname and Access App A are active; it is not a public application bypass.
- `enforce`: every matched Hub application route requires a cryptographically verified `cf-access-jwt-assertion`. The verifier requires RS256, a matching JWKS `kid`, signature, `CA_ACCESS_ISSUER`, `CA_ACCESS_AUDIENCE`, `exp`, and `nbf` when present. Missing or invalid configuration/assertions return 403.
- Any other value is a configuration error and returns 403.

The relay route remains strict in both modes: `/api/ca-analyst/*` always verifies an assertion independently. The relay forwards only the validated contextual body and the received assertion as `cf-access-token`; it does not accept client identity, model, tool, URL, budget, citation, or system-instruction fields.

## Operator order

1. Deploy with `CA_ACCESS_ORIGIN_A_MODE=pre-activation`.
2. Attach the custom hostname to Vercel and complete certificate/domain verification. Keep only the two documented `/.well-known/*` exceptions; do not add a broad route or host-header bypass.
3. Create and configure Access App A and set `CA_ACCESS_JWKS_URL`, `CA_ACCESS_ISSUER`, and `CA_ACCESS_AUDIENCE` for App A. Verify a signed token against the deployed origin, including negative tests.
4. Set `CA_ACCESS_ORIGIN_A_MODE=enforce` and redeploy. Confirm both the custom hostname and direct Vercel hostname reject missing, forged, wrong-audience, wrong-issuer, expired, and future-`nbf` assertions, while a valid assertion reaches the expected Hub route.
5. Only after origin A is enforced, provision the linked App B/service and test the relay delegation. This revision does not change Cloudflare, DNS, Vercel, service, secret, deployment, or model-provider configuration.

Unsafe configurations rejected by this code include missing/partial JWT settings while enforcing, malformed mode values, host-header-based bypass attempts, presence-only assertions, alternate issuers/audiences, unsupported signing algorithms, and any extra public well-known or application bypass.
