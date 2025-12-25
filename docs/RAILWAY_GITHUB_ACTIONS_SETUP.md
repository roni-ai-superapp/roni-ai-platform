# Railway + GitHub Actions Setup Guide

This documents how to set up automated deployments from GitHub to Railway for roni-ai-platform services.

## Prerequisites

1. Railway project created with service
2. Self-hosted GitHub Actions runner
3. GitHub CLI (`gh`) authenticated

## Setup Steps

### 1. Create Railway Project Token

1. Go to Railway Dashboard → Project Settings → Tokens
2. Click "New Token"
3. Select the target environment (e.g., `dev`)
4. Copy the token (only shown once)

### 2. Set GitHub Secrets

```bash
# Set the Railway token (scoped to specific environment)
echo "<token>" | gh secret set RAILWAY_TOKEN --repo roni-ai-superapp/<repo-name>

# Set the Railway project ID
echo "<project-id>" | gh secret set RAILWAY_PROJECT_ID --repo roni-ai-superapp/<repo-name>
```

### 3. Create Workflow File

Create `.github/workflows/deploy-dev.yml`:

```yaml
name: Deploy to Dev

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-dev
  cancel-in-progress: true

env:
  RAILWAY_SERVICE: <service-name>
  DEPLOY_ENVIRONMENT: dev
  DEV_URL: https://<service-url>.up.railway.app

jobs:
  deploy:
    name: Deploy to Dev
    runs-on: [self-hosted]
    timeout-minutes: 30
    environment:
      name: dev
      url: ${{ env.DEV_URL }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install jq
        run: |
          if ! command -v jq &> /dev/null; then
            if command -v brew &> /dev/null; then
              brew install jq
            fi
          fi

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Determine commit SHA
        id: commit
        run: |
          SHA="${{ github.sha }}"
          echo "full=${SHA}" >> $GITHUB_OUTPUT
          echo "short=${SHA:0:12}" >> $GITHUB_OUTPUT

      - name: Install Railway CLI
        run: |
          npm install -g @railway/cli@latest
          railway --version

      - name: Configure Railway project
        run: |
          mkdir -p .railway
          cat > .railway/config.json << EOF
          {
            "projectId": "${{ secrets.RAILWAY_PROJECT_ID }}"
          }
          EOF

      - name: Set commit SHA variable
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          railway variables \
            --service "${{ env.RAILWAY_SERVICE }}" \
            --environment "${{ env.DEPLOY_ENVIRONMENT }}" \
            --set "COMMIT_SHA=${{ steps.commit.outputs.full }}" \
            --skip-deploys || true

      - name: Deploy to Railway
        id: deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          OUTPUT=$(railway up \
            --service "${{ env.RAILWAY_SERVICE }}" \
            --environment "${{ env.DEPLOY_ENVIRONMENT }}" \
            --ci 2>&1) || true
          echo "$OUTPUT"

          if echo "$OUTPUT" | grep -q "No changed files"; then
            echo "needs_redeploy=true" >> $GITHUB_OUTPUT
          else
            echo "needs_redeploy=false" >> $GITHUB_OUTPUT
          fi

      - name: Force redeploy if needed
        if: steps.deploy.outputs.needs_redeploy == 'true'
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          railway environment "${{ env.DEPLOY_ENVIRONMENT }}"
          railway redeploy --service "${{ env.RAILWAY_SERVICE }}" --yes

      - name: Verify deployment
        run: |
          # Poll health endpoint until SHA matches
          EXPECTED="${{ steps.commit.outputs.short }}"
          for i in {1..30}; do
            BODY=$(curl -fsS "${{ env.DEV_URL }}/health" 2>/dev/null || echo '{}')
            DEPLOYED=$(echo "$BODY" | jq -r '.sha // "none"')
            if [ "${DEPLOYED:0:12}" = "$EXPECTED" ]; then
              echo "Deployment verified!"
              exit 0
            fi
            sleep 10
          done
          echo "::warning::Timeout waiting for commit verification"
```

### 4. Health Endpoint Requirements

The service must expose a `/health` endpoint that includes the `COMMIT_SHA` env var:

```typescript
fastify.get('/health', async () => ({
  status: 'healthy',
  sha: process.env.COMMIT_SHA || 'unknown',
  // ... other fields
}));
```

### 5. Set Up Self-Hosted Runner

**Option A: Via GitHub Web Interface (Recommended)**

1. Go to `https://github.com/roni-ai-superapp/<repo>/settings/actions/runners`
2. Click "New self-hosted runner"
3. Select macOS/ARM64
4. Follow the displayed commands:

```bash
mkdir -p ~/actions-runner-<service>
cd ~/actions-runner-<service>
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-osx-arm64-2.321.0.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/roni-ai-superapp/<repo> --token <TOKEN_FROM_WEB> --name <runner-name> --unattended --replace

# Start runner in background
nohup ./run.sh > runner.log 2>&1 &
```

**Option B: Via CLI (requires admin permissions)**

```bash
# Get registration token (requires admin:repo_hook scope)
TOKEN=$(gh api -X POST /repos/roni-ai-superapp/<repo>/actions/runners/registration-token | jq -r '.token')

# Download and configure runner
mkdir -p ~/actions-runner-<service>
cd ~/actions-runner-<service>
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-osx-arm64-2.321.0.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/roni-ai-superapp/<repo> --token $TOKEN --name <runner-name> --unattended --replace

# Start runner
nohup ./run.sh > runner.log 2>&1 &
```

**Verify runner is active:**
```bash
gh api /repos/roni-ai-superapp/<repo>/actions/runners | jq '.runners[].name'
```

## Current Services

| Service | Repo | Railway Project | Secrets | Runner | Status |
|---------|------|-----------------|---------|--------|--------|
| platform-api | repo-platform-api | platform | ✅ | ✅ | ✅ Deployed |
| frontend | repo-frontend | platform | ✅ | ⏳ Pending | ⏳ Waiting for runner |
| plaid | plaid | platform | ✅ | ⏳ Pending | ⏳ Waiting for runner |
| plaid-frontend | plaid-frontend | platform | ✅ | ⏳ Pending | ⏳ Waiting for runner |

### Project IDs

- **Railway Project ID:** `530e76c1-550a-4a2b-a9f3-d6c8bb46540b`
- **Railway Environment (dev):** `eacbd1ad-9d94-4eea-a15e-09ba763d3f78`

### Runner Setup Commands (Quick Reference)

```bash
# For frontend
mkdir -p ~/actions-runner-frontend
cd ~/actions-runner-frontend
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-osx-arm64-2.321.0.tar.gz
tar xzf actions-runner.tar.gz
# Get token from: https://github.com/roni-ai-superapp/repo-frontend/settings/actions/runners/new
./config.sh --url https://github.com/roni-ai-superapp/repo-frontend --token <TOKEN> --name frontend-runner --unattended --replace
nohup ./run.sh > runner.log 2>&1 &

# For plaid
cd ~/actions-runner-plaid
# Get token from: https://github.com/roni-ai-superapp/plaid/settings/actions/runners/new
./config.sh --url https://github.com/roni-ai-superapp/plaid --token <TOKEN> --name plaid-runner --unattended --replace
nohup ./run.sh > runner.log 2>&1 &

# For plaid-frontend
mkdir -p ~/actions-runner-plaid-frontend
cd ~/actions-runner-plaid-frontend
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-osx-arm64-2.321.0.tar.gz
tar xzf actions-runner.tar.gz
# Get token from: https://github.com/roni-ai-superapp/plaid-frontend/settings/actions/runners/new
./config.sh --url https://github.com/roni-ai-superapp/plaid-frontend --token <TOKEN> --name plaid-frontend-runner --unattended --replace
nohup ./run.sh > runner.log 2>&1 &
```

## Secrets Reference

| Secret | Description | Where to get |
|--------|-------------|--------------|
| `RAILWAY_TOKEN` | Project token scoped to environment | Railway Dashboard → Settings → Tokens |
| `RAILWAY_PROJECT_ID` | UUID of the Railway project | Railway Dashboard URL or `railway status` |
