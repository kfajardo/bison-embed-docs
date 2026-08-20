# bison-embed-docs

Consumer documentation for embedding Bison JIB Pay in a host application.

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
| `src/content/docs/index.mdx` | The integration guide: launch request, iframe, events |
| `src/content/docs/troubleshooting.md` | Failure modes and their causes |
| `src/components/Flow.astro` | The launch-flow diagram |
| `src/styles/theme.css` | Design tokens carried over from the Bison design system |
| `astro.config.mjs` | Site title and sidebar order |

Starlight turns each `.md` or `.mdx` file in `src/content/docs/` into a route named after the file.

## Keeping it accurate

The API contract in the guide is written by hand against the JIB Pay swagger snapshot. When the iframe-session endpoints change, update `index.mdx` and `troubleshooting.md` to match.

`theme.css` transcribes the `bison-ui` design tokens rather than importing them, so the site has no build dependency on that package. When the design system moves, update the values.

Before publishing, replace the `<embed-origin>` placeholders with the real per-environment origins.
