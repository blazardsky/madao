# Publishing astro-madao

Preferred path: bump the version with `pnpm ship`, publish to npm, then push commits and tags to GitHub.

## Prerequisites

1. Clean working tree (or only intentional uncommitted changes you want in the release).
2. Logged into npm:

```bash
npm whoami
# if needed:
npm login
```

3. On `main`, up to date with remote.

## Version bump

Current version lives in `package.json` (`"version": "x.y.z"`).

| Argument | Semver change | Example (`0.2.3` →) |
|----------|---------------|---------------------|
| `patch`  | `x.y.z` → `x.y.(z+1)` | `0.2.4` |
| `minor`  | `x.y.z` → `x.(y+1).0` | `0.3.0` |
| `major`  | `x.y.z` → `(x+1).0.0` | `1.0.0` |

When to use which:

| Bump    | When |
|---------|------|
| `patch` | Bug fixes, small docs/tooling |
| `minor` | New features, backward compatible |
| `major` | Breaking API changes |

`pnpm ship` applies the bump for you — do **not** edit `package.json` by hand.

Pending files in `.changeset/` are consumed in the same run. If an older pending changeset is `minor` and you pass `patch`, the version still bumps to the highest required type (e.g. `0.3.0`).

## Release procedure

```bash
# 1. Commit and push feature work first (optional but cleaner)
git push

# 2. Bump version + changelog + publish to npm
pnpm ship <patch|minor|major> "Changelog message"

# Examples:
pnpm ship patch "Fix middleware path resolution"          # 0.2.3 → 0.2.4
pnpm ship minor "Add exclude with folder and ! support"   # 0.2.3 → 0.3.0
pnpm ship major "Breaking: rename excludePaths to exclude" # 0.2.3 → 1.0.0

# 3. Push the release commit and version tag to GitHub
git push && git push --tags
```

What step 2 (`pnpm ship`) does:

1. Formats, lints, and builds
2. Creates a changeset with your bump type + message
3. Runs `changeset version`:
   - bumps `"version"` in `package.json`
   - updates `CHANGELOG.md`
   - removes consumed `.changeset/*.md` files
4. Rebuilds and commits `release: vX.Y.Z`
5. Publishes `astro-madao@X.Y.Z` to npm and creates git tag `vX.Y.Z` (or the changesets tag format)

Step 3 syncs that release commit and tags to GitHub. npm is already published after step 2.

## Alternative: CI release PR

There is also `.github/workflows/release.yml` (changesets/action). On push to `main` with pending changesets, CI can open a **release: version packages** PR (that PR contains the version bump). Merging it publishes when `NPM_TOKEN` is set in GitHub secrets.

Prefer **one** path per release:

- Local `pnpm ship` (version bump + publish) → push, **or**
- Leave a changeset, push, merge the CI release PR

Do not run both for the same changes or you can get double bumps / publish conflicts.

## After publishing

Consumers on npm:

```bash
pnpm add astro-madao@latest
```

Local `file:` installs are snapshots. After changing this repo, reinstall in the site:

```bash
# in madao
pnpm build

# in the site project
pnpm install --force astro-madao
```

## Checklist

- [ ] Choose bump: `patch` / `minor` / `major`
- [ ] `pnpm ci` passes (or ship’s format/lint/build succeeds)
- [ ] `npm whoami` works
- [ ] `pnpm ship <bump> "message"` — version bumped, npm published
- [ ] Confirm `package.json` version and `CHANGELOG.md` look right
- [ ] `git push && git push --tags`
- [ ] Confirm on https://www.npmjs.com/package/astro-madao
