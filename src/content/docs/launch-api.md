---
title: Launch API
description: Reference for the server-side launch and revoke endpoints, and the exchange call the iframe makes.
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
pagefind: true
---

Your server calls two endpoints on the Bison API base URL. Both authenticate with the same two headers, and neither may be called from a browser.

| Endpoint | Purpose |
| --- | --- |
| `POST /partner/energylink/embed-sessions` | Start a session. Returns the iframe URL and a launch token |
| `POST /partner/energylink/embed-sessions/revoke` | End every session for a user and organization |

## Start a session

```http
POST /partner/energylink/embed-sessions
Content-Type: application/json
Authorization: Bearer <machine token>
X-EnergyLink-User-Authorization: Bearer <user access token>
```

The path has no `/api` prefix. How to mint both tokens, and the rules each must meet, are in [Authentication](/authentication/).

### Request body

```json
{
  "audience": "working_interest_owner",
  "parentOrigin": "https://app.example.com",
  "initialPath": "/wio/dashboard"
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `audience` | Yes | Exactly `working_interest_owner`, with underscores. No other value is accepted |
| `parentOrigin` | Yes | The origin of the page that hosts the iframe. See below |
| `initialPath` | Yes | The first screen. One of the values in the next table |

Any other property in the body fails the request with `400` and `invalid_launch_request`. That includes `clientUserId`, user IDs, roles and permissions. Bison derives all of them from your tokens.

`parentOrigin` must be an absolute origin with no path, query, fragment or credentials. It must use `https`. `http` is accepted only for `localhost` and `127.0.0.1`, and only in environments where Bison enabled it. The embed itself accepts `http` only for `localhost`. Bison lowercases the scheme and host and drops a default port before it compares the value with the allowed origins, so register `https://app.example.com`, not `https://app.example.com/dashboard`.

| `initialPath` | Screen |
| --- | --- |
| `/wio/dashboard` | Dashboard |
| `/wio/jib` | JIB |
| `/wio/revenue` | Revenue |
| `/wio/reports` | Reports |
| `/wio/settings` | Settings |
| `/wio/jib-setup` | JIB setup |

### Response

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "iframeUrl": "https://<embed-origin>/embed",
    "launchToken": "<43-character token>",
    "expiresAt": "2026-10-07T07:15:30Z",
    "audience": "working_interest_owner",
    "module": "payments"
  },
  "errors": [],
  "timestamp": "2026-10-07T07:15:00Z",
  "traceId": null
}
```

| Field | Meaning |
| --- | --- |
| `iframeUrl` | The embed's URL. Load it as returned. It contains no token and no screen |
| `launchToken` | A single-use token. The iframe exchanges it for a session |
| `expiresAt` | When the launch token stops working, in UTC. At most 30 seconds after the call |
| `audience` | `working_interest_owner` |
| `module` | `payments` |

The response carries `Cache-Control: no-store, private` and `Pragma: no-cache`. Don't cache it, and send `no-store` on whatever you return to your browser.

### Errors

Failures from Bison's checks use the same envelope with `success` set to `false` and an `errorCode`. A malformed body, a rate-limit rejection and an internal error use other shapes, listed in the table. Branch on `errorCode`, not on `message`.

```json
{
  "success": false,
  "message": "The embedded parent origin is not authorized.",
  "data": null,
  "errors": [],
  "timestamp": "2026-10-07T07:15:00Z",
  "traceId": null,
  "errorCode": "origin_not_allowed"
}
```

Bison checks in this order: the rate limit, the body's shape, unknown fields and `audience`, its own configuration, `parentOrigin` (its format, then the allow-list), `initialPath`, the machine token, the user token, identity, and last, whether the user token predates a revoke. The first failure is the one you see.

| Status | `errorCode` | Cause | What to do |
| --- | --- | --- | --- |
| `400` | `invalid_launch_request` | The body has an unknown field, `audience` is not `working_interest_owner`, `parentOrigin` is not a valid origin, or `initialPath` is not in the list | Fix the body |
| `400` | none | The body is missing, is not valid JSON, or a field is missing or too long. The response is a standard `application/problem+json` document | Fix the body |
| `401` | `invalid_clerk_token` | The machine token is missing, has whitespace or is too long, is JWT-shaped, expired, revoked, from another machine, created more than 30 seconds ahead of Bison's clock, or lives longer than 300 seconds. Clerk can also reject it for another reason | Mint a new token and check the rules |
| `401` | `invalid_auth0_token` | The user token is invalid, or it was issued at or before the last revoke | Get a fresh user token |
| `403` | `origin_not_allowed` | `parentOrigin` is valid but not on the allow-list | Ask Bison to register the exact origin |
| `403` | `invalid_clerk_token` | The machine token lacks the scope Bison requires | Ask Bison which scope your machine needs |
| `403` | `embedded_access_denied` | The user or account is inactive, or the user's roles on the account are missing or not supported | Ask Bison to check the user's access |
| `404` | `external_identity_not_mapped` | No active link for this user or organization | Ask Bison to create the link |
| `404` | `external_scope_not_mapped` | The user and account are linked, but Bison has no payment scope for them | Ask Bison to finish the setup |
| `409` | `external_identity_ambiguous`, `external_scope_ambiguous` | `sub` and `https://energylink.com/user_id` point at different user links, or the user link matches only one of them. Or more than one payment-scope link matches | Contact Bison |
| `415` | none | The `Content-Type` is not `application/json` | Send `Content-Type: application/json` |
| `429` | none. `errors` holds `RATE_LIMIT_EXCEEDED` | More than the allowed requests in the window | Wait for the `Retry-After` header, then retry |
| `500` | none | An unexpected error. One known cause: Clerk answers `400` or `404` to the machine token | Check the machine token first, then contact Bison |
| `502` | `invalid_clerk_response` | Clerk's answer lacks a field Bison needs. Most often the token has no expiry | Mint the token with an expiry of 300 seconds or less, then retry. If it persists, contact Bison |
| `503` | `clerk_unavailable`, `auth0_unavailable` | Bison could not reach Clerk or your identity provider, or your provider's discovery document no longer matches Bison's configuration | Retry with backoff. If it persists, contact Bison |
| `503` | `embeddable_not_configured` | This environment is not set up for your integration | Contact Bison |

### Rate limit

Launch and revoke share one limit: 100 requests per minute for each source IP address. Bison can change both numbers per environment. A backend that sends all its users' launches from one IP address shares one allowance.

## Revoke sessions

```http
POST /partner/energylink/embed-sessions/revoke
Authorization: Bearer <machine token>
X-EnergyLink-User-Authorization: Bearer <user access token>
```

There is no request body. Bison ends every session and unused launch token for the user and organization in the user token.

```json
{
  "success": true,
  "message": "Success",
  "data": { "revoked": true },
  "errors": [],
  "timestamp": "2026-10-07T07:15:00Z",
  "traceId": null
}
```

Revoke checks the machine token, the user token and the user's identity, with the same errors as above, and skips the body, origin and screen checks. If Bison can no longer resolve the user, for example because they were deactivated, it returns the identity error and revokes nothing. Their sessions stop working on their next call anyway.

After a revoke, a launch needs a user token issued after it. See [Authentication](/authentication/#revoke-sessions).

## The exchange call

Your code never calls the exchange endpoint. The iframe does, and you will see it in your browser's network tab.

```http
POST /api/embeddable/iframe-sessions/exchange
Content-Type: application/json
```

```json
{ "launchToken": "<launch token>" }
```

The request has no `Authorization` header. A successful response carries the session:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "accessToken": "<opaque session token>",
    "expiresAtUtc": "2026-10-07T08:15:00Z",
    "clientUserId": "<id>",
    "wioId": "<id>",
    "roles": ["WIO-Owner"],
    "scopeType": "WIO",
    "operatorId": null,
    "parentOrigin": "https://app.example.com",
    "initialPath": "/embed/payments/dashboard"
  },
  "errors": [],
  "timestamp": "2026-10-07T07:15:00.482Z",
  "traceId": null
}
```

| Status | `errorCode` | Cause | What the iframe does |
| --- | --- | --- | --- |
| `401` | `invalid_or_expired_launch_token` | The token is unknown, expired, already used, revoked, or longer than 256 characters | Posts `bison.embed.sessionInvalidated` and a new `bison.embed.launchReady`. `Link expired` flashes, then the iframe shows `Opening JIB Pay` until your page sends a new token |
| `400` | none | `launchToken` is missing | The same as above |
| `503` | `embeddable_not_configured` | This environment is not set up | Shows `Unable to open JIB Pay` with a `Try again` button |

The iframe treats any `4xx` except `408` and `429` as an expired token, and any other failure as temporary. See [Messages](/messages/) for what your page receives and [Troubleshooting](/troubleshooting/) for the symptoms.
