# Development Environment Setup

## Prerequisites

This is a **Node.js/TypeScript** project using npm workspaces.

### Required

- **Node.js**: >= 18.0.0 (see `.nvmrc`)
- **npm**: >= 9.0.0

### Recommended

- **nvm** (Node Version Manager) for consistent Node.js versions
- **VS Code** with TypeScript extension

## Environment Setup

### 1. Node.js Version

Use nvm to ensure consistent Node.js version across all agents:

```bash
# Install nvm if not already installed
# https://github.com/nvm-sh/nvm

# Use project Node version
nvm use

# Or install if not present
nvm install
```

### 2. Install Dependencies

From the main repo (`/Users/preston/Projects/bots-n-cats`):

```bash
npm install
```

This installs dependencies for all workspace packages.

### 3. Build All Packages

```bash
npm run build
```

### 4. Verify Setup

```bash
node smoke-test.js
```

Expected output: All 6 tests passing ✅

## Git Worktrees

This project uses git worktrees for parallel development:

| Worktree | Path | Branch | Issues |
|----------|------|--------|--------|
| Main | `~/Projects/bots-n-cats` | main | Foundation |
| Webhook | `~/Projects/bots-webhook` | webhook-pipeline | BOC-1, 2, 9 |
| Audio | `~/Projects/bots-audio` | audio-services | BOC-20 full |
| Music | `~/Projects/bots-music` | music-generation | BOC-3, 4 |
| Cats | `~/Projects/bots-cats` | cat-sounds | BOC-11, 12 |
| Stream | `~/Projects/bots-stream` | streaming | BOC-13 |

### Working in a Worktree

```bash
# Navigate to your worktree
cd ~/Projects/bots-webhook

# Install dependencies (uses shared node_modules)
npm install

# Start development
npm run dev
```

## Development Workflow

### For Agents

1. **Navigate to your worktree**
   ```bash
   cd ../bots-webhook  # or your assigned worktree
   ```

2. **Read CLAUDE.md** for your specific tasks

3. **Import from audio-core**
   ```typescript
   import { ToneAudioCore, AudioEventBus } from '@bots-n-cats/audio-core';
   ```

4. **Build and test**
   ```bash
   npm run build
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: implement BOC-X"
   git push origin your-branch
   ```

## TypeScript Configuration

- **Base config**: `tsconfig.base.json` (shared)
- **Per-package**: Extends base with package-specific settings
- **Module system**: ESM (required for Tone.js)
- **Target**: ES2020

## Package Structure

```
packages/
├── audio-core/          # Core infrastructure (BOC-20)
│   ├── src/
│   │   ├── core/       # ToneAudioCore
│   │   ├── events/     # AudioEventBus
│   │   ├── resources/  # ResourceManager
│   │   ├── factories/  # InstrumentFactory
│   │   └── types/      # Shared types
│   └── dist/           # Built output
├── webhook-server/      # GitHub webhooks (BOC-1, 2, 9)
└── music-engine/        # Event→music mapping (BOC-3, 4)
```

## Common Commands

```bash
# Build all packages
npm run build

# Build specific package
npm run build -w @bots-n-cats/audio-core

# Clean build artifacts
npm run clean

# Run smoke test
node smoke-test.js

# List worktrees
git worktree list
```

## Environment Variables

Each package may have its own `.env` file. See package-specific READMEs.

Example for webhook-server:
```bash
PORT=3000
GITHUB_WEBHOOK_SECRET=your_secret_here
```

## Troubleshooting

### "Cannot find module" errors

```bash
# Rebuild from main repo
cd ~/Projects/bots-n-cats
npm run build
```

### TypeScript errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Worktree not found

```bash
# Recreate worktree
git worktree add -b <branch-name> <path> main
```

## VS Code Setup

Recommended `settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## Notes for AI Agents

- **All worktrees share the same `node_modules`** - changes in dependencies affect all
- **Follow architectural patterns** in CLAUDE.md
- **Use AudioEventBus** for cross-service communication
- **Track all Tone.js objects** with ResourceManager
- **ESM imports require .js extensions** in TypeScript files

---

**Happy coding! Let's make this code purr! 🐱**
