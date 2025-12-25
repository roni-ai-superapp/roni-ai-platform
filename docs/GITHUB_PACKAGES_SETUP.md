# GitHub Packages Setup Guide

This documents how to publish private npm packages to GitHub Packages and consume them in other repos (including Railway builds).

## Overview

GitHub Packages allows publishing private npm packages scoped to your organization. This is useful for sharing code between private repos without making it public.

**Key constraint**: The npm scope must match the GitHub organization name exactly.
- Organization: `roni-ai-superapp`
- Package scope: `@roni-ai-superapp/`

## 1. Publishing a Package

### 1.1 Update package.json

```json
{
  "name": "@roni-ai-superapp/shared-contracts",
  "version": "0.1.0",
  "private": false,
  "repository": {
    "type": "git",
    "url": "https://github.com/roni-ai-superapp/1-shared-contracts.git"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "package.json"
  ],
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "scripts": {
    "prepublishOnly": "npm run build"
  }
}
```

**Critical fields:**
- `name`: Must use `@<org-name>/` scope (lowercase)
- `private: false`: Required to publish
- `repository`: Links package to repo for permissions
- `publishConfig.registry`: Forces publish to GitHub Packages
- `files`: Only include built artifacts (not source)
- `prepublishOnly`: Ensures build runs before publish

### 1.2 Create Publish Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to GitHub Packages

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          registry-url: "https://npm.pkg.github.com"
          scope: "@roni-ai-superapp"

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Key points:**
- Triggered on GitHub Release publish
- Uses `GITHUB_TOKEN` (automatic, no PAT needed)
- `permissions.packages: write` is required
- `setup-node` configures the registry

### 1.3 Publish First Version

```bash
# Create and publish a release
gh release create v0.1.0 --repo roni-ai-superapp/<repo> --title "v0.1.0" --notes "Initial release"
```

The workflow will run and publish to: `https://github.com/orgs/roni-ai-superapp/packages`

## 2. Consuming the Package

### 2.1 Add .npmrc to Consumer Repo

Create `.npmrc` in repo root:

```
@roni-ai-superapp:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

**Critical**: The `_authToken` line is required - it tells npm to use the `NODE_AUTH_TOKEN` env var for authentication.

### 2.2 Add Dependency

```json
{
  "dependencies": {
    "@roni-ai-superapp/shared-contracts": "^0.1.0"
  }
}
```

### 2.3 Local Development

Create a GitHub PAT with `read:packages` scope:
1. Go to https://github.com/settings/tokens/new
2. Select "Classic" token
3. Check `read:packages`
4. Copy the token

Set it in your shell:
```bash
export NODE_AUTH_TOKEN=ghp_xxxxx
npm install
```

Or add to `~/.npmrc` (be careful with secrets):
```
//npm.pkg.github.com/:_authToken=ghp_xxxxx
```

## 3. Railway Build Configuration

### 3.1 Set NODE_AUTH_TOKEN Variable

```bash
railway link -p <project-id> -e dev -s <service>
railway variables --set "NODE_AUTH_TOKEN=ghp_xxxxx"
```

Or via Railway Dashboard:
1. Go to service → Variables
2. Add `NODE_AUTH_TOKEN` = your PAT with `read:packages` scope

### 3.2 Required PAT Scopes

For Railway builds consuming private packages:
- `read:packages` - Required to download packages

For publishing workflows:
- `GITHUB_TOKEN` is sufficient (automatic in Actions)

## 4. Common Issues & Fixes

### 4.1 "Permission permission_denied: The requested installation does not exist"

**Cause**: Package scope doesn't match org name.
**Fix**: Rename package from `@roni-ai/` to `@roni-ai-superapp/`

### 4.2 "401 Unauthorized - authentication token not provided"

**Cause**: Missing `_authToken` in .npmrc
**Fix**: Add this line to .npmrc:
```
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

### 4.3 "Cannot install with frozen-lockfile because pnpm-lock.yaml is absent"

**Cause**: Using `pnpm install --frozen-lockfile` without lockfile
**Fix**: Use `npm install` in publish workflow, or commit pnpm-lock.yaml

### 4.4 ESM/CommonJS Conflicts

**Cause**: Config files using `module.exports` in ESM project
**Fix**: Rename config files:
- `postcss.config.js` → `postcss.config.cjs`
- `tailwind.config.js` → `tailwind.config.cjs`

### 4.5 Git SSH Access Denied in Builds

**Cause**: Using `github:org/repo` dependency (uses SSH)
**Fix**: Use npm package from GitHub Packages instead

## 5. Version Management

```bash
# Bump version
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

# Create release to trigger publish
gh release create v$(node -p "require('./package.json').version")
```

**Rule**: Every publish requires a new version. You cannot republish the same version.

## 6. Current Packages

| Package | Repo | Registry |
|---------|------|----------|
| @roni-ai-superapp/shared-contracts | 1-shared-contracts | npm.pkg.github.com |

## 7. Consuming Repos

Each consumer repo needs:
1. `.npmrc` with registry and auth token config
2. `NODE_AUTH_TOKEN` env var set for CI/builds

| Repo | .npmrc | Railway TOKEN |
|------|--------|---------------|
| repo-frontend | ✅ | ✅ |
| repo-platform-api | ⏳ | ⏳ |
| repo-data-ingestion | ⏳ | ⏳ |

## 8. Quick Reference

### Publish a new version:
```bash
cd packages/shared-contracts
npm version patch
git push origin main --tags
gh release create v$(node -p "require('./package.json').version")
```

### Add to a new consumer repo:
```bash
# Create .npmrc
cat > .npmrc << 'EOF'
@roni-ai-superapp:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
EOF

# Add dependency
npm install @roni-ai-superapp/shared-contracts

# Set Railway variable
railway variables --set "NODE_AUTH_TOKEN=ghp_xxxxx"
```
