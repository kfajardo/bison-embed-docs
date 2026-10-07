---
title: Messages
description: Every postMessage your page can send to or receive from the iframe.
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
pagefind: true
---

Your page and the iframe talk with `postMessage`. Every message is an object with a `type` string.

## Rules

- **The iframe sends to your origin only.** It addresses every message to the origin Bison registered for your site, never to `'*'`.
- **The iframe accepts your messages only from your origin and only from its parent window.** It ignores everything else.
- **Check both on your side.** Compare `event.origin` with the embed origin, the origin of `iframeUrl`. Compare `event.source` with the iframe's `contentWindow`.
- **Send to the embed origin.** Pass it as the `targetOrigin` of every `postMessage`.
- **Ignore what you don't recognize.** Unknown types and extra fields are not errors.

## Launch handshake

| Direction | `type` | Payload | When |
| --- | --- | --- | --- |
| iframe to page | `bison.embed.launchReady` | none | Once per handshake: when the iframe loads, and again after every `bison.embed.sessionInvalidated`. It is not repeated |
| page to iframe | `bison.embed.launchToken` | `launchToken`: string | Your answer. The iframe accepts the first valid token of each handshake and ignores the rest |

A token must be a non-empty string of at most 256 characters. The iframe trims surrounding whitespace. A token that arrives before the iframe is listening is lost, so reply only after `launchReady`.

If the iframe never gets a token it stays on `Opening JIB Pay`. It does not time out.

## Events from the iframe

None of these needs a reply. A page that ignores all of them still works, as long as it answers the handshake and recovers from `sessionInvalidated`.

| `type` | Payload | When |
| --- | --- | --- |
| `bison.embed.viewChanged` | `view`: `dashboard`, `jib`, `revenue`, `reports` or `settings` | The iframe lands on a screen, including the first one. It is not sent for JIB setup |
| `bison.embed.ready` | none | Each time the JIB screen opens |
| `bison.embed.jibSetupCompleted` | none | The user submits the final step of JIB setup successfully. `viewChanged` with `jib` follows |
| `bison.embed.sessionInvalidated` | none | The session ended or was rejected. See below |

Don't rely on the order of `ready` and `viewChanged` when the JIB screen opens. Either can arrive first.

```js
window.addEventListener('message', (event) => {
  if (event.origin !== embedOrigin || event.source !== frame.contentWindow) return;

  switch (event.data?.type) {
    case 'bison.embed.viewChanged':
      highlightTab(event.data.view);
      break;
    case 'bison.embed.jibSetupCompleted':
      refreshSetupStatus();
      break;
  }
});
```

### When the session is invalidated

The iframe posts `bison.embed.sessionInvalidated` in three cases:

- The exchange fails with a `4xx` status other than `408` or `429`. The launch token was unknown, expired or already used.
- The session reaches its expiry time.
- Bison answers `401` to a call that used the current session. For example, you revoked it, or the user lost access.

It is always followed by a new `launchReady`. While the iframe opens, a `5xx`, `408`, `429` or a dropped connection shows `Unable to open JIB Pay` with `Try again`, and any other `4xx` counts as an expired token. Once the session is open, only a `401` invalidates it: a `403`, `404`, `5xx` or a dropped connection shows an error inside the screen.

Recover as described in [Step 3 of the guide](/#step-3-handle-expiry).

## What the iframe doesn't send

- **No height.** There is no resize message. Size the iframe yourself.
- **No navigation request.** The iframe never asks your page to change screens. To change the screen, load a new iframe. See [Screens and navigation](/screens/).
- **No popup messages.** Bank linking uses a popup that talks to the iframe only. You never see those messages.

## Optional: render the payment review in your own modal

By default the iframe opens its payment dialog inside itself. If you want your page to own the dialog, implement the protocol below. Opt in only if you implement every step. Until you answer a request, the iframe won't open another one.

| Direction | `type` | Payload |
| --- | --- | --- |
| page to iframe | `bison.host.capabilities` | `modalEmbeddables`: `true` |
| iframe to page | `bison.modal.openRequested` | `requestId`, `modal` |
| modal iframe to page | `bison.modal.ready` | `requestId` |
| page to modal iframe | `bison.host.modalContext` | `requestId`, `modal` |
| modal iframe to page | `bison.modal.stateChanged` | `requestId`, `busy`, `dirty` |
| page to modal iframe | `bison.host.modalCloseRequested` | `requestId` |
| modal iframe to page | `bison.modal.closeRequested` | `requestId` |
| modal iframe to page | `bison.modal.completed` | `requestId`, `outcome`: `updated`, `modal` |
| page to iframe | `bison.modal.closed` | `requestId` |
| page to iframe | `bison.modal.completed` | `requestId`, `outcome`: `updated` |

The sequence:

1. After `bison.embed.ready`, send `{ type: 'bison.host.capabilities', modalEmbeddables: true }` to the iframe. The value must be exactly `true`. The iframe listens only while the JIB screen is open, so send it again each time `ready` arrives.
2. The user chooses invoices and selects pay. The iframe posts `bison.modal.openRequested` with a new `requestId` and a `modal` object:

    ```json
    {
      "type": "bison.modal.openRequested",
      "requestId": "<uuid>",
      "modal": {
        "kind": "wio-jib-payment-review",
        "resourceId": "[\"<invoiceId>\"]",
        "payload": {
          "invoices": [
            {
              "id": "<id>",
              "invoiceId": "<id>",
              "invoiceNumber": "<number>",
              "operator": "<operator name>",
              "invoiced": 1200.5,
              "balance": 1200.5,
              "disputed": 0
            }
          ]
        }
      }
    }
    ```

3. Open a second iframe at `<embed-origin>/embed/payments/jib-payment#requestId=<requestId>`. It runs its own launch handshake, so start a new session on your server for it and answer its `launchReady`. Send any valid `initialPath`. The modal iframe ignores it.
4. The modal iframe posts `bison.modal.ready`. Reply with `bison.host.modalContext`, repeating the `requestId` and the `modal` object from step 2 unchanged. The iframe validates it and ignores anything malformed.
5. While the user works, the modal iframe posts `bison.modal.stateChanged` with `busy` set to `true` during a payment. Don't close the modal while `busy` is `true`.
6. To close from your side, send `bison.host.modalCloseRequested`. The modal iframe ignores it while busy. When the user closes the dialog, the modal iframe posts `bison.modal.completed` if every invoice in the payment succeeded. After a partial or failed result it posts `bison.modal.closeRequested` instead.
7. Remove the modal iframe, then tell the main iframe: send `bison.modal.closed` if nothing changed, or `bison.modal.completed` with `outcome` set to `updated` after a payment. The second one makes the main iframe refresh its invoices. If `busy` was ever `true`, send `bison.modal.completed` even after a `closeRequested`, because a partial payment may have changed some invoices.

From `bison.modal.openRequested` on, every message in the exchange carries the same `requestId`. The iframes ignore messages with a different one.

The modal iframe is a full embed session of its own. It posts its own `launchReady` and can post its own `sessionInvalidated`, so route every message by `event.source` to tell the main iframe from the modal iframe. After a re-handshake in place, the main iframe posts `ready` again, so send `bison.host.capabilities` again.
