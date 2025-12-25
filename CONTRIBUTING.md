# Contributing to Roni AI Platform

## Repository Structure

This is a monorepo using Git submodules. Each package is its own repository.

```
roni-ai-platform/           # This repo (parent)
├── packages/
│   ├── shared-contracts/   # github.com/roni-ai-superapp/1-shared-contracts
│   ├── platform-api/       # github.com/roni-ai-superapp/repo-platform-api
│   ├── frontend/           # github.com/roni-ai-superapp/repo-frontend
│   └── ...
└── services/
    ├── plaid/              # github.com/roni-ai-superapp/plaid
    └── ...
```

## Initial Setup

```bash
# Clone with all submodules
git clone --recurse-submodules https://github.com/roni-ai-superapp/roni-ai-platform.git

# Or if already cloned without submodules
git submodule update --init --recursive
```

## Working with Submodules

### Pulling Latest Changes

```bash
# Update all submodules to latest remote
git submodule update --remote --merge

# Or update a specific submodule
cd packages/frontend
git pull origin main
```

### Making Changes

1. **Navigate to the submodule**:
   ```bash
   cd packages/frontend
   ```

2. **Make your changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add new component"
   git push origin main
   ```

3. **Update the parent repo to reference new commit**:
   ```bash
   cd ../..  # Back to monorepo root
   git add packages/frontend
   git commit -m "chore: update frontend submodule"
   git push origin main
   ```

### Creating a Branch

When working on a feature that spans multiple packages:

```bash
# Create branch in each submodule you're modifying
cd packages/frontend
git checkout -b feature/my-feature

cd ../platform-api
git checkout -b feature/my-feature

# Create matching branch in parent
cd ../..
git checkout -b feature/my-feature
```

## Commit Guidelines

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code change that doesn't fix a bug or add a feature
- `test:` Adding tests
- `chore:` Build process or auxiliary tool changes

Examples:
```
feat(frontend): add TableBox sorting
fix(platform-api): handle null cost in revenue calculation
docs(shared-contracts): add business rules documentation
```

## Pull Requests

1. Create PRs in individual package repos first
2. Once merged, update the parent repo's submodule reference
3. If changes span multiple packages, coordinate the merges

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Meaningful variable names
- Comments for non-obvious logic only

## Testing

```bash
# Run tests in a package
cd packages/shared-contracts
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Environment Variables

Never commit secrets. Use `.env.example` files as templates:

```bash
# Copy example files
cp packages/platform-api/.env.example packages/platform-api/.env
cp packages/frontend/.env.example packages/frontend/.env.local
```

## Questions?

- Check `.claude/AGENT_CONTEXT.md` for technical context
- Check `ROADMAP.md` for what's done and what's next
- Open an issue for questions or proposals
