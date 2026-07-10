# madao – Astro AI‑Ready Middleware

![](/assets/madao.webp)

`madao (マダオ)` is a tiny Astro integration that injects a `<link rel="alternate" type="text/markdown" …>` tag into every rendered HTML page. The tag points to a generated Markdown representation of the page under a `/md/` folder, making the site **AI‑ready**: LLMs can consume the raw Markdown alongside the HTML. It also generates `llms.txt` and `llms-full.txt` to assure compatibility with more ai-bots.

## Features

- **Zero‑config**: add the integration to your `astro.config.mjs` and the middleware is wired automatically.
- **SSR‑friendly**: runs as an Astro middleware, works with static builds and server‑side rendering.
- **Markdown export**: on `astro:build:done` you can implement a conversion pipeline that writes the page HTML to Markdown files under `dist/md/`.
- **Developer tooling**: includes Biome for lint/format, Changesets for versioning & releasing, and a CI workflow.

## Installation

```bash
npm i -D madao
# install peer dependency if you haven't already
npm i astro
```

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from "astro";
import madao from "madao";

export default defineConfig({
  integrations: [madao()],
});
```

## Usage

The middleware will automatically append a `<link>` tag pointing to the Markdown file for the current page. You can then flesh out the `astro:build:done` hook to generate those Markdown files.

## Development

```bash
# lint & format
npm run lint
npm run format

# build
npm run build
```

## Releasing

We use **Changesets** to manage releases:

```bash
# create a changeset
npm run changeset
# version bump & changelog generation
npm run version
# publish to npm
npm run release
```

The CI workflow runs lint, type‑checking and the build on every push.
