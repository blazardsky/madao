# madao

## 0.3.1

### Patch Changes

- Fix accented-character mojibake when serving markdown by emitting `_headers` (and middleware Content-Type) with an explicit charset inferred from the page `<meta charset>` / `http-equiv` content-type, falling back to `utf-8`. Add Vitest coverage for utils, middleware, integration builds, UTF-8 preservation, and charset header generation.

## 0.3.0

### Minor Changes

- b64b466: new excludePaths options, removed direct folder option support

### Patch Changes

- 4725088: fixed middleware unresolved
- 2.0.4

## 0.3.0

- Added `excludePaths` option
- Removed direct folder option

## 0.2.1

- small fixes

## 0.2.0

- Excluded 404 pages from generation

## 0.1.0

- Initial release of madao Astro integration for AI-ready markdown export
