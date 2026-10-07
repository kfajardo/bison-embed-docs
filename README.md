# bison-embed-docs

Integration documentation for embedding Bison JIB Pay in a host application.

Built with [Astro Starlight](https://starlight.astro.build).

## Running it

```bash
npm install
npm run dev
```

The dev server runs at `localhost:4321`. `npm run build` writes the static site to `./dist/`, and `npm run preview` serves that build.

## Where the content lives

| Path | Contents |
| --- | --- |
| `src/content/docs/index.mdx` | The guide: start a session, load the iframe, answer `launchReady`, handle expiry, frame requirements |
| `src/content/docs/authentication.md` | The four credentials, identity mapping, revocation, origin checks |
| `src/content/docs/screens.md` | Screens, `initialPath`, switching screens, permissions |
| `src/content/docs/launch-api.md` | Launch and revoke reference, error catalog, the exchange call |
| `src/content/docs/messages.md` | The `postMessage` contract and the optional payment-modal protocol |
| `src/content/docs/troubleshooting.md` | Symptoms, causes and fixes |
| `src/components/Flow.astro` | The five-stage launch-flow diagram |
| `src/components/Sidebar.astro` | The navigation: logo, search, each page with its sections, the theme switch |
| `src/components/Header.astro` | The top bar, shown only on phones and on the 404 page |
| `src/components/PageSidebar.astro` | Renders nothing: there is no "On this page" panel |
| `src/components/MarkdownContent.astro` | Splits each page into two-column rows, prose left and code right |
| `src/components/Head.astro` | Loads the Inter and JetBrains Mono fonts |
| `src/styles/theme.css` | Design tokens, content typography, code cards, the diagram |
| `src/styles/layout.css` | Page frame, rows, page title, cards |
| `ec.config.mjs` | Code block theme |
| `astro.config.mjs` | Site title, description, sidebar order |

Starlight turns each `.md` or `.mdx` file in `src/content/docs/` into a route named after the file. Restart the dev server after you edit `astro.config.mjs`.

## Keeping it accurate

The contract in these pages is written from the code of `bison-jib-pay-api`, `bison-jib-web-flow` and `energy-link-mock`, not from a swagger snapshot. The swagger file lags the code, and the older consumer guide in `bison-jib-web-flow/docs/embeddable/` describes a contract that no longer exists.

`AGENTS.md` lists the source files that define the contract and the commits the pages were last verified against. Before you edit a page, check what changed since then.

`theme.css` transcribes the `bison-ui` design tokens rather than importing them, so the site has no build dependency on that package. When the design system moves, update the values.

Before publishing, replace the `<embed-origin>` placeholders with the real per-environment origins, and set `site` in `astro.config.mjs` so the sitemap builds.
