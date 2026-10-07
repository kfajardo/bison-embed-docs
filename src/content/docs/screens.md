---
title: Screens and navigation
description: Which screens the embed has, how your page opens one, and who can do what in each.
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
pagefind: true
---

Your page owns navigation. The iframe has no tab bar and accepts no message that changes its screen. To show a screen, start a session with that screen's `initialPath` and load a new iframe.

## Screens

| Screen | `initialPath` | `view` in `viewChanged` | What the user does there |
| --- | --- | --- | --- |
| Dashboard | `/wio/dashboard` | `dashboard` | Reads JIB and revenue totals |
| JIB | `/wio/jib` | `jib` | Reviews JIB invoices, filters them, and pays them |
| Revenue | `/wio/revenue` | `revenue` | Reads recent royalty payments |
| Reports | `/wio/reports` | `reports` | Downloads JIB reports |
| Settings | `/wio/settings` | `settings` | Manages company profile, notifications, bank accounts and payment cards |
| JIB setup | `/wio/jib-setup` | none | Sets up payments: business information, payment methods and documents |

Pass the `initialPath` in the launch request. Bison accepts these six values and rejects anything else with `400`.

Settings has its own sections inside the screen. They are not addressable, so you can't link to one.

## Switch screens

Each screen change is a new launch: a new request to your server, a new launch token, and a new iframe. The iframe keeps its session in memory, so a new document needs a new session.

```js
let closeCurrent;

async function showScreen(path) {
  closeCurrent?.();
  closeCurrent = await openBison(container, path);
}

showScreen('/wio/dashboard');
```

`openBison` is the function from [the guide](/#step-2-load-the-iframe-and-answer-launchready). It returns a function that closes the iframe and stops any automatic relaunch, and that stays valid even after the iframe relaunches itself.

Use `bison.embed.viewChanged` to keep your own navigation in step when the iframe moves by itself. It tells you which screen is open. See [Messages](/messages/).

## JIB setup

JIB setup is the guided payment setup for a working interest owner. It has three steps: business information, payment methods and documents. The iframe has no link to it, so your page decides when to offer it by launching with `/wio/jib-setup`.

When the user submits the last step successfully, the iframe posts `bison.embed.jibSetupCompleted` and moves to the JIB screen.

## Permissions

Roles come from Bison's records for the user and account, not from your token. Ask Bison to change a user's roles.

| Bison role | Dashboard, JIB, Revenue, Reports | Pay invoices and set up payments | Settings |
| --- | --- | --- | --- |
| `WIO-Owner` | Yes | Yes | Read and edit |
| `WIO-Viewer` | Yes | No | Read only |
| `WIO` | Yes | Limited | No |

The table assumes the user has one role. A user with more than one role gets no Settings access, so the `WIO` row applies.

A `WIO-Viewer` still sees the Pay buttons and the setup form. The payment and onboarding APIs answer `403` when the user tries.

`WIO` alone is limited because of how the iframe loads its data. The payment API accepts a user with only `WIO`, but the payment dialog reads saved bank accounts and cards through the Settings endpoints, and those need Settings read access. Without it the dialog shows `Bank accounts could not be loaded. Please close this window and try again.` The setup form reads Settings data when it opens, too. Assign `WIO-Owner` to users who pay or set up payments.

Settings needs exactly one role: `WIO-Viewer` or `WIO-Owner`. A user with only `WIO`, or with more than one role, sees `Settings access is not configured`.

A launch fails with `403` and `embedded_access_denied` if the user has no roles on the account, or any role outside these three. See [Launch API](/launch-api/#errors).
