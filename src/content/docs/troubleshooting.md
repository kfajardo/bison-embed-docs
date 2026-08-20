---
title: Troubleshooting
description: Common failures when embedding Bison JIB Pay, and what causes them.
---

## The launch request fails

Check the status code from `POST /api/embeddable/iframe-sessions`.

| Status | Cause | Fix |
| --- | --- | --- |
| `400` | Missing or invalid `clientUserId`, or an `audience` that isn't `working-interest-owner` or `operator` | Check the request body |
| `401` | App ID or App Secret rejected | Confirm the credentials match the environment you're calling |
| `403` | Credentials are valid, but the partner token doesn't grant access to this user | Confirm the Partner Access Token and that `clientUserId` is correct |
| `503` | Bison can't issue sessions right now | Retry with backoff |

`curl` the endpoint directly to separate a bad request from a bad integration. If `curl` works and your app doesn't, the credentials are fine and the fault is in your code.

## The iframe is blank

Open the browser console.

**"Refused to frame ... violates Content-Security-Policy"** means your own CSP is blocking it. Add the embed origin to `frame-src`.

**"Refused to display ... in a frame"** means Bison isn't allowing your origin yet. Send Bison the exact origin, including scheme and port (`https://app.example.com`, `http://localhost:3000`).

If there is **no error at all**, check that `src` is set. When the fetch fails, `src` stays empty and the iframe renders as blank space.

## The iframe collapses to nothing

The embed has no intrinsic height. Give the iframe an explicit height, or stretch it in a flex or grid layout.

## "Link expired" appears immediately

A launch URL works once, so the code was already used or has expired.

Common causes:

- The URL was fetched early and the iframe mounted later. Request it when you're ready to render.
- The same URL was reused after a reload, or across two iframes. Each iframe needs its own.
- The iframe alone was refreshed. That replays the original URL, which no longer works. Reload your page instead, or refetch and reset `src`.

## Navigation, downloads, or bank linking don't work

Usually a `sandbox` attribute that's too restrictive. You don't need `sandbox` at all; if you use it, include every value listed on the main page.

If navigation works but files do not download, the iframe's `sandbox` value is missing `allow-downloads`. Add `allow-downloads` to the existing token list, or remove the `sandbox` attribute if you don't need it.

## The user lands on the wrong screen

The launch URL opens the default screen for the audience. Check that you're sending the `audience` you intended.

To open a different screen, see *Opening a specific screen* on the main page.

## Everything works locally but not in production

Usually one of:

- Credentials still point at the non-production environment
- The production origin was never sent to Bison
- The production CSP doesn't include the embed origin

Each environment has its own credentials, embed origin, and allowed origin list.
