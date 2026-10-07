---
title: Authentication
description: The four credentials in an embed session, what each one proves, and how long each one lives.
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
pagefind: true
---

An embed session passes through four credentials. Each has one job.

| Credential | Held by | Lifetime | Sent to | Proves |
| --- | --- | --- | --- | --- |
| Machine token | Your server | 300 seconds at most | The launch and revoke endpoints, as `Authorization` | The caller is your backend |
| User access token | Your server | Set by your identity provider | The launch and revoke endpoints, as `X-EnergyLink-User-Authorization` | Which user and organization is launching |
| Launch token | Bison, then your server, then your page, then the iframe | 30 seconds at most, one use | The exchange endpoint, by the iframe | Your page handed this launch over |
| Session token | The iframe, in memory | 60 minutes at most, set per environment | Bison's API, by the iframe, as `Authorization` | This user's session |

Your page only ever sees the launch token. The machine token and the user access token stay on your server, and the session token never leaves the iframe.

## Machine token

The machine token identifies your backend. Bison verifies it with Clerk, and it must meet every rule below.

- It is an opaque Clerk machine-to-machine token. A token shaped like a JWT (two dots) is rejected.
- It has an expiry, and its lifetime, from creation to expiry, is 300 seconds or less. A token with no expiry fails with `502` and `invalid_clerk_response`.
- It has not expired and has not been revoked.
- Its subject is the machine Bison registered for your backend.
- Clerk stamps its creation time. Bison rejects a token stamped more than 30 seconds ahead of Bison's clock.
- It has no whitespace and is at most 16,384 characters.
- If Bison requires a scope for your machine, the token carries it.

A missing scope returns `403`. Bison's own checks return `401`, and so does any other error answer from Clerk, including a Clerk `5xx`. If Clerk can't be reached or times out, Bison returns `503`. If Clerk's answer lacks a field Bison needs, such as an expiry, it returns `502`. If Clerk answers `400` or `404`, Bison currently returns `500` with a generic body and no `errorCode`. See [Launch API](/launch-api/#errors).

Send it as `Authorization: Bearer <token>`. Mint a new token before the old one expires. The reference host caches one and replaces it when 60 seconds remain.

## User access token

The user access token tells Bison who is launching. Your identity provider issues it, and Bison verifies it against the provider's published signing keys.

- It is a JWT signed with `RS256`.
- `iss` matches the issuer Bison has on file for you.
- `aud` matches the audience Bison configured.
- `exp` is present and in the future. Bison allows a small clock skew, 30 seconds by default.
- `iat` is present and not in the future, within the same skew.
- `scope` contains `bison:embed`.
- Each claim in the table appears exactly once, is not blank, and is at most 255 characters by default.

| Claim | Value |
| --- | --- |
| `sub` | The user's subject in your identity provider |
| `https://energylink.com/user_id` | The user's ID in your system |
| `https://energylink.com/organization_id` | The organization's ID in your system. It selects the working interest owner account |
| `https://energylink.com/audience` | `working-interest-owner`, with hyphens |

Send it as `X-EnergyLink-User-Authorization: Bearer <token>`. It must be at most 16,384 characters and contain no whitespace.

The launch body names the audience with underscores, `working_interest_owner`. The token claim uses hyphens. Both must say working interest owner, in their own spelling.

## Identity

You never send a user ID to Bison. Bison derives the identity from the verified claims:

1. `https://energylink.com/user_id` and `sub` select a linked Bison user. Both must match the same active link. If they point at different links, or a link matches only one of them, the launch fails with `409` and `external_identity_ambiguous`.
2. `https://energylink.com/organization_id` selects a linked working interest owner account.
3. Bison loads that user's roles for the account.

Bison does not create users or links during a launch. A user or organization without a link fails with `404` and `external_identity_not_mapped`. Ask Bison to create the link. The roles come from Bison, not from your token. See [Screens and navigation](/screens/#permissions).

## Launch token

Bison returns the launch token in the launch response.

- It is 32 random bytes, encoded as 43 URL-safe characters.
- It works once. Bison consumes it atomically, so a second exchange fails even if both arrive together.
- It lives at most 30 seconds, counted from the launch call. `expiresAt` in the response is the exact deadline.
- Bison records the user, organization, parent origin and first screen with it, and the session it opens carries them. Nothing re-checks the parent origin when the token is exchanged: whoever holds the token can redeem it. It is not bound to an IP address or a browser, so treat it as a secret while it exists.

Your page passes it to the iframe with `postMessage`. The iframe accepts it only from your site's origin and from its parent window, only once per handshake, and only up to 256 characters.

## Session token

The iframe exchanges the launch token for a session token with `POST /api/embeddable/iframe-sessions/exchange`. You don't call that endpoint.

- It is opaque. It is not a JWT and carries no claims.
- The iframe keeps it in memory only: not in cookies, not in `localStorage` or `sessionStorage`, and not in the URL. Reloading the iframe discards it.
- The iframe sends it as `Authorization: Bearer <token>` on every call to Bison. No cookie is involved.
- Its lifetime is fixed when it is created, between 1 and 60 minutes, set by Bison per environment. There is no refresh. After it expires, the iframe asks your page for a new launch token.
- Bison re-checks it against current data on every request. The user, the account and the roles must still be valid, and roles are read fresh each time. Removing a user's access takes effect on the next call, and the iframe reports it with `bison.embed.sessionInvalidated`.
- A user can hold several sessions at once. Each iframe you load has its own.

## Revoke sessions

Call the revoke endpoint when a user signs out of your app, or when you need to cut off their embedded sessions.

```http
POST /partner/energylink/embed-sessions/revoke
Authorization: Bearer <machine token>
X-EnergyLink-User-Authorization: Bearer <user access token>
```

Bison ends every session and unused launch token for that user and organization. A user token carries one organization, so a user who works in several organizations needs one revoke call per organization. The next launch needs a user access token issued after the revocation. A token issued at or before it fails with `401` and `invalid_auth0_token`, so issue a fresh one. See [Launch API](/launch-api/#revoke-sessions) for the response and errors.

## Where your origin is checked

Your site's origin matters in four places. A mismatch in any of them stops the embed.

| Check | Where | If it fails |
| --- | --- | --- |
| Allowed launch origins | Bison, at launch | `403` and `origin_not_allowed` |
| The embed's trusted host origin | The embed deployment, fixed when it is built | The browser drops the iframe's `launchReady`, so your page never hears from it and the iframe stays on `Opening JIB Pay`. If the embed has no valid trusted origin at all, it shows `Link expired` instead |
| Your Content Security Policy | Your page | The browser refuses to load the iframe |
| Origin checks in your listener | Your page | Your page ignores the iframe's messages |

The embed trusts exactly one host origin, fixed when the embed is built. It is separate from the allow-list Bison checks at launch, and nothing compares the two. A second host origin, such as a staging site or `localhost`, needs a Bison configuration change and, unless the embed build already trusts it, its own embed build.

Register the exact origin: scheme, host and port, with no path. `https://app.example.com` and `http://localhost:3000` are different origins. For local development use `localhost`, not `127.0.0.1`: the embed does not trust `127.0.0.1`.

## Checklist for your side

- Keep the machine secret and the user access token on your server.
- Return the launch token with `Cache-Control: no-store`, and don't log it.
- Take `parentOrigin` from configuration, not from a request.
- Check `event.origin` and `event.source` on every message.
- Answer each `launchReady` with a new launch token.
- Call the revoke endpoint when a user signs out.
