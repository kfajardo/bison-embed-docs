# AGENTS.md

`CLAUDE.md` is a symlink to this file. Build and run commands are in `README.md`.

## Memory

Stable facts that are expensive to re-derive. Verified 2026-10-07 against committed HEADs:
web-flow `dd775933` (branch `feat/host-owned-payment-pages`), pay-api `a37bdfab` (branch `embed/operator-onboarding`),
energy-link-mock `d46a1ac` (branch `feat/host-owned-payment-pages`). Before editing a page, check drift:
`git -C <repo> log --oneline <sha>..origin/main -- <paths below>`. Update the matching page and this file in the same change.

### Scope
- Documents the working-interest-owner (WIO) embed only. Operator launch and operator onboarding are not documented: no host-facing operator launch exists at those commits, and the uncommitted operator-payments-onboarding work in web-flow and pay-api is Paying-Agent-integrated.
- `bison-payments` (Paying Agent) is out of scope. Never open it.
- Only on a branch at verification time, not on `origin/main`: host-owned navigation (web-flow `3062db3d` removed the in-iframe tab bar and the `JIB Setup` tab; energy-link-mock `6a785cc`, `d46a1ac`). `screens.md` describes it. Confirm it is merged and deployed before publishing. The launch and handshake contract (OUT-336) is already on `origin/main` in both repos.

### Source of truth (read committed blobs with `git show HEAD:<path>`; web-flow and pay-api checkouts often carry someone else's uncommitted work)
- Launch and revoke, pay-api: `BisonJibPay.API/Controllers/EnergylinkEmbeddedWioSessionsController.cs`, `Features/BisonJibPay.Embeddable/Infrastructure/Services/{EmbeddableIframeSessionService,ClerkMachineTokenValidator,EnverusAccessTokenValidator}.cs`, `Features/BisonJibPay.Embeddable/Domain/{DTOs/EmbeddableIframeSessionDtos,Configuration/EmbeddablePartnerSettings}.cs`, `Infrastructure/Repositories/EmbeddableExternalIdentityRepository.cs`, `BisonJibPay.API/Program.cs` (rate limiter, error envelope).
- Exchange and session, pay-api: `Controllers/EmbeddableIframeSessionsController.cs`, `Infrastructure/Attributes/EmbeddableSessionAuthAttribute.cs`, `Infrastructure/Services/SqlEmbeddableIframeSessionStore.cs`.
- Iframe, web-flow: `src/embed/{embed_launch_protocol.ts,embed_session.tsx,embed_app.tsx}`, `src/embed/payments/{payments_layout.tsx,jib_payment_modal_protocol.ts}`, `src/embed/payments/pages/{jib_payment_modal,jib_setup,settings}.tsx`.
- Host reference, energy-link-mock: `src/app/api/bison/embed/launch/route.ts`, `src/lib/bison-partner-client.ts` (`postBisonPartnerJson`), `src/lib/bison-machine-token.ts`, `src/lib/bison-embed-manifest.ts`, and the launch, handshake and iframe-element parts of `src/components/BisonPaymentsEmbed.tsx`. That component is shared with the Paying Agent: read only those parts.

### Contract in one line
Host server `POST /partner/energylink/embed-sessions` with `Authorization: Bearer <Clerk M2M opaque token, 300 s max>` and `X-EnergyLink-User-Authorization: Bearer <Auth0 RS256 JWT, scope bison:embed>`, body `{audience: working_interest_owner, parentOrigin, initialPath}` returns `{iframeUrl, launchToken}` (30 s max, single use). The page loads the iframe, which posts `bison.embed.launchReady` once per handshake. The page replies `bison.embed.launchToken`. The iframe calls `POST /api/embeddable/iframe-sessions/exchange` and keeps an opaque bearer in memory (60 min max, no refresh). The host never sends `clientUserId`: Bison derives identity from token claims and admin-created links.

### Decisions and dead ends
- The old guide (`?launchCode=`, `X-Bison-App-Id`, `X-Bison-App-Secret`, `X-Partner-Access-Token`, `clientUserId`, `operator` audience, `POST /api/embeddable/iframe-sessions`) was removed by OUT-336 (pay-api `42a341df`, web-flow `4b36c344`, 2026-09-03). Do not bring it back. The three headers survive only on Development and QA demo helpers.
- Stale, not references: energy-link-mock `GET /api/bison-jib-web-flow/embed-url`, `POST /api/bison/jib-pay/settings-launch`, `BisonJibWebFlowEmbed.tsx`, its README; web-flow `docs/embeddable/consumer_integration.md`; web-flow `swagger.json` (untracked dev snapshot).
- Do not assert, because the repos can't prove it: response headers Azure App Service adds (CSP, `frame-ancestors`), per-environment values, the deployed session lifetime (tracked config sets 60 min, code default 15, allowed 1 to 60).
- Left out on purpose: the Revenue screen's static "Royalty Cash Advance" panel, the Settings "Documents" placeholder, and the optional `?resume=1` setup-draft parameter.
- Documented as reality at the verified commits, drop if fixed: Clerk SDK errors outside `SDKError` (HTTP 400 and 404 from Clerk verify) escape `ClerkMachineTokenValidator` and surface as `500` (`launch-api.md` `500` row, `authentication.md` machine-token section).
- Documented, code-derived and not confirmed live: a user whose only role is `WIO` cannot pay from the iframe. The payment dialog reads bank accounts and cards from `/api/embeddable/settings/*`, which need `settings:read` (sole role `WIO-Viewer` or `WIO-Owner`). Sources: pay-api `EmbeddableSessionAuthAttribute.cs:164-194`, web-flow `jib_payment_dialog.tsx:40-41,518`. Probably a product bug; if fixed, update `screens.md`.
- Origin symptoms differ: a valid but different embed host origin leaves the iframe on `Opening JIB Pay` (the browser drops `launchReady`). `Link expired` with no messages at all means the embed has no valid host origin. The embed trusts one host origin, fixed at build time (`VITE_EMBED_PARENT_ORIGIN`), separate from pay-api `AllowedParentOrigins`; nothing compares them.

### How these pages were verified
Code read first-hand at the commits above, then audited by three independent reviewers (256 claims, every one checked against `git show HEAD:`; 4 wrong and 25 imprecise were fixed). Keep that discipline: a second reader verifies every claim before a page changes. Never trust the swagger snapshot or the older prose docs.

## Design and copy
- The look matches the Enverus EnergyLink API reference, a Scalar site at https://enverus.bisonpayments.com/sandbox/energylink/docs (the user's decision, 2026-10-07; it replaced the old `bison-ui` transcription and the Bison green). Match it closely; do not reintroduce brand colors. `theme.css` holds Scalar's rendered values as `--scalar-*` tokens (light on `:root`, dark on `[data-theme='dark']`) and maps Starlight's variables onto them. Never write "Scalar", "Enverus" or "OpenAPI" in visible UI.
- Voice: bison-voice allows fuller prose in technical docs. Site chrome and quoted UI strings stay strict: sentence case, no emoji, no exclamation marks, errors say what happened and what to do.
- In `.mdx`, keep angle-bracket placeholders inside backticks or code fences.
- Layout: `MarkdownContent.astro` slices the rendered page into a section per h2 and a row per h2 or h3. A row's top-level code blocks, `.bison-card`s and the Flow diagram move to its right column, which sticks only when it is short. `PageTitle.astro` renders nothing: the first row carries `h1#_top`. There is no right-hand contents panel; the sidebar lists each page's h2s and badges a section whose code block opens with a request line (`POST /path`).
- Code blocks: `ec.config.mjs` uses one dark theme in both site themes, like Scalar's code cards, and turns the request line of an untitled `http` block into a `POST /path` header. Astro's content cache ignores `ec.config.mjs`: build with `--force` after changing it.
- The sidebar tree keeps its scroll position in `sessionStorage` (`bison-nav-scroll`); the theme switch stores `starlight-theme` in `localStorage`, which Starlight applies before first paint. Starlight reads `components` at start, so restart the dev server after changing them. Astro 7 refuses a second `astro dev` in one project; use `astro preview` on another port.
