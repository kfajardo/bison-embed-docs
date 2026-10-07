---
title: Troubleshooting
description: Symptoms when embedding Bison JIB Pay, what causes them, and how to fix them.
pagefind: true
---

Find the symptom, then the cause. Most problems fall into three groups: the launch call, the handshake, and the frame itself.

## The launch request fails

Read `errorCode` in the response and look it up in the [error table](/launch-api/#errors). The ones you are most likely to meet:

| Status | `errorCode` | Usually means |
| --- | --- | --- |
| `400` | `invalid_launch_request` | The body has an extra field, or `audience`, `parentOrigin` or `initialPath` has a value Bison doesn't accept |
| `401` | `invalid_clerk_token` | The machine token is expired, JWT-shaped, from the wrong machine, or lives longer than 300 seconds |
| `401` | `invalid_auth0_token` | The user token is invalid, or was issued at or before your last revoke |
| `403` | `origin_not_allowed` | `parentOrigin` is not on Bison's list. Send the exact origin, with scheme and port |
| `404` | `external_identity_not_mapped` | Bison has no link for this user or organization |
| `429` | none | More than the allowed launches per minute from one IP address |
| `500` | none | An unexpected error. One known cause is a machine token that Clerk answers with `400` or `404`. Check the token first |
| `503` | `embeddable_not_configured` | The environment isn't set up for you yet |

Bison checks the body, your origin, the first screen, the machine token, the user token and the user's identity, in that order. The first failure wins, so a bad origin hides a bad token behind it.

Run the same call with `curl` to separate a bad request from a bad integration. If `curl` works and your app doesn't, the credentials are fine and the fault is in your code.

## The iframe stays on "Opening JIB Pay"

The iframe is waiting for a launch token. It posts `bison.embed.launchReady` once and does not retry, then waits with no time limit. The same screen shows while the exchange request is in flight, so if you can see the `exchange` call in the network tab, read its status first. Otherwise check, in order:

- **Your listener exists before `src` is set.** A `launchReady` that arrives before your listener is lost.
- **Your origin check compares with the embed origin.** Compare `event.origin` with the origin of `iframeUrl`, not with your own site's origin, and compare `event.source` with the iframe's `contentWindow`.
- **You reply with the right shape.** The message is `{ type: 'bison.embed.launchToken', launchToken }`, and the token is a non-empty string of at most 256 characters.
- **Your `targetOrigin` is the embed origin.** The browser doesn't deliver a `postMessage` whose target origin doesn't match the iframe's. It doesn't throw, but Chromium browsers log a target-origin mismatch error in the console.
- **The embed is configured for a different host origin.** The iframe addresses `launchReady` to the one origin its deployment is configured with. If that isn't your page's exact origin, the browser drops the message, your listener never fires and the iframe stays on `Opening JIB Pay`. Ask Bison to confirm the host origin configured for the embed, and that it matches the `parentOrigin` you send.

## "Link expired" never goes away

If the iframe shows `Link expired` and stays that way, and your page receives no message at all, the embed deployment has no usable host origin: the configured value is missing or malformed. It must be an exact origin, `https` or `http` on `localhost`, with no path. The iframe then posts nothing, so it can't tell your page why it stopped.

Ask Bison to check the host origin configured for the embed in your environment. A valid origin that differs from yours gives a different symptom: see [The iframe stays on "Opening JIB Pay"](#the-iframe-stays-on-opening-jib-pay).

## "Link expired" flashes, then the iframe starts over

The iframe rejected your launch token and asked for a new one. The token was unknown, expired, already used, or revoked. A launch token works once and lives at most 30 seconds.

- Request a token as late as you can, and use it at once.
- Answer every `launchReady` with a freshly issued token. If you reply with the same token again, the iframe loops between `launchReady` and `bison.embed.sessionInvalidated`.
- Reuse nothing across iframes. Each iframe needs its own token.
- If it fails on the first load only, check that the call to your server and the iframe load together take under 30 seconds.
- A device clock that is far ahead of real time makes the iframe treat a new session as already expired.

## "Unable to open JIB Pay"

A temporary problem blocked the exchange: a dropped connection, a `5xx`, `408` or `429`. `Try again` sends the same launch token again. If it keeps failing, open the network tab, find the `exchange` call, and note its status. A `503` with `embeddable_not_configured` means the environment isn't set up, and only Bison can fix it.

## The session ends while the user works

Sessions are short-lived: at most 60 minutes, with no refresh. The iframe also ends a session when Bison reports it invalid, for example after you revoke it or the user loses access. In both cases it posts `bison.embed.sessionInvalidated`. Recover as described in [Step 3 of the guide](/#step-3-handle-expiry).

## "Settings access is not configured"

Settings needs exactly one role, `WIO-Viewer` or `WIO-Owner`. A user with only `WIO`, or with several roles, doesn't qualify. Ask Bison to change the user's roles. See [Permissions](/screens/#permissions).

## The iframe is blank or collapses

Open the browser console.

- **An error that names `frame-src`, `child-src` or `default-src`** means your own Content Security Policy is blocking the iframe. Add the embed origin to `frame-src`.
- **An error that mentions `frame-ancestors` or `X-Frame-Options`** comes from a header set in front of the embed. Send Bison the exact message.
- **No message at all.** Check that `src` is set. When your server call fails, your page has nothing to load, so show the failure in your own UI.
- **The iframe has no height.** The embed fills its frame and scrolls inside, so a frame with no height collapses. Give it an explicit height, or stretch it in a flex or grid layout.

## Bank linking, downloads or card entry don't work

- **Bank linking opens nothing.** The user's browser blocked the popup. The iframe says `Allow popups for this site to securely connect a bank account.` If you use a `sandbox`, it needs `allow-popups` and `allow-popups-to-escape-sandbox`.
- **Downloads do nothing.** A `sandbox` without `allow-downloads` blocks them. Add the token, or drop the attribute.
- **Card entry says `Open EnergyLink over HTTPS to add a payment card.`** Your page is served over plain HTTP. Serve it over HTTPS.
- **Everything fails inside a sandboxed iframe.** The `sandbox` lacks `allow-same-origin`, so the iframe's requests carry an opaque origin. Its messages also arrive with `event.origin` set to `'null'`, so your origin check ignores `launchReady` and the iframe stays on `Opening JIB Pay`.

The full token list is in [Frame requirements](/#frame-requirements).

## It works locally but not in production

Each environment has its own API base URL, machine credential, embed origin, allowed origins, identity links and identity-provider settings. The usual causes:

- A credential or URL still points at the non-production environment.
- The production origin was never registered with Bison, both for launches and for the embed.
- The production Content Security Policy doesn't include the embed origin.
- A user or organization exists in production but isn't linked.

For local development, use `http://localhost:<port>`, not `127.0.0.1`, and ask Bison to enable it for your test environment.

## What to send Bison

- The `errorCode` and the time of the failing call.
- The status of the `exchange` call from the network tab, if the iframe is involved.
- The exact console message, if there is one.
- The embed origin and your site's origin.
