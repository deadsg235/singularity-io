# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Singularity.io** is a multi-layered blockchain infrastructure project for the Solana ecosystem with components for:

1. **X402 Payment Protocol** - Multi-chain implementation (Solana SVM, EVM)
2. **Frontend** - Web UI with Solana wallet integration
3. **Backend** - FastAPI service with Vercel deployment
4. **GUI** - Go-based desktop application
5. **Analytics** - Solfunmeme introspection tool (Python/Lean)

### Tech Stack

- **TypeScript Monorepo**: pnpm workspaces + Turbo for build orchestration
- **Blockchain**: Solana (SVM), EVM chains, X402 protocol
- **Frontend**: React/TypeScript
- **Backend**: Python FastAPI
- **GUI**: Go
- **DeploymentVercel (frontend + serverless API), Firebase/Cloud for backend services

## Repository Structure

```
singularity-io/
├── typescript/                    # Main monorepo (pnpm + Turbo)
│   ├── packages/
│   │   ├── core/                 # X402 core protocol definition
│   │   ├── extensions/           # Protocol extensions
│   │   ├── mechanisms/           # Chain implementations
│   │   │   ├── svm/             # Solana VM implementation
│   │   │   └── evm/             # EVM chain implementation
│   │   ├── http/                # HTTP server integrations
│   │   │   ├── next/            # Next.js middleware
│   │   │   ├── express/         # Express integration
│   │   │   ├── hono/            # Hono framework
│   │   │   └── paywall/         # Payment gateway UX
│   │   └── legacy/              # Previous X402 implementations
│   │       └── x402/            # Core X402 reference
│   ├── examples/                # SDK usage examples
│   ├── site/                    # Documentation/demo site
│   ├── pnpm-workspace.yaml      # Monorepo config
│   ├── turbo.json              # Turbo pipeline config
│   └── tsconfig.base.json      # Shared TypeScript config
├── web/
│   └── singularity-frontend/   # React web application
├── api/                        # FastAPI backend (Vercel serverless)
├── ui/                         # Go GUI components
├── solfunmeme-introspector/    # Solana analytics (Python/Lean)
└── yarn.lock

```

## Common Development Commands

### TypeScript Monorepo (pnpm + Turbo)

**Setup & Installation:**
```bash
cd typescript
pnpm install        # Install all dependencies
pnpm turbo run build  # Build all packages (respects dependency order)
```

**Development:**
```bash
# Run scripts across monorepo
pnpm turbo run build        # Build all packages
pnpm turbo run lint         # Lint all packages
pnpm turbo run format       # Format all files
pnpm turbo run test         # Run all tests
pnpm turbo run test:watch   # Watch mode testing

# Single package work
cd packages/mechanisms/svm
pnpm build                  # Build just this package
pnpm test                   # Run tests in this package
pnpm test:watch            # Watch mode for this package
```

**Package-specific commands** (generally available in all TS packages):
```bash
pnpm build              # tsup bundling (ESM + CJS)
pnpm test               # vitest single run
pnpm test:watch         # vitest watch mode
pnpm format             # prettier format
pnpm format:check       # Check formatting without modifying
pnpm lint               # ESLint with auto-fix
pnpm lint:check         # ESLint check without fix
```

**Running examples:**
```bash
cd examples/[example-name]
pnpm install
pnpm start              # Run the example
```

### Frontend (React/Next.js)

```bash
cd web/singularity-frontend
pnpm install
pnpm dev                # Development server
pnpm build              # Production build
pnpm test               # Run tests
```

### Backend (FastAPI)

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload    # Development server (auto-reloads)
uvicorn main:app --port 8000 # Specify port
```

### GUI (Go)

```bash
cd ui
go build -o singularity-ui    # Build executable
./singularity-ui              # Run
```

### Solfunmeme Introspector (Python/Lean)

```bash
cd solfunmeme-introspector
pip install -r requirements.txt
python main.py
# Lean proofs available in SolfunmemeLean/
```

## Architecture Notes

### X402 Protocol Design

The X402 payment protocol uses a **layered architecture**:

1. **Core Layer** (`packages/core/`)
   - Protocol definitions and verification logic
   - Client/server/facilitator abstractions
   - Paywall concepts (protected resources)
   - Built with zero-dependency design for portability

2. **Mechanism Layers** (`packages/mechanisms/`)
   - **SVM**: Solana-specific token and transaction handling
   - **EVM**: Ethereum-compatible chain support
   - Each mechanism implements the core interfaces for its blockchain

3. **HTTP Integration** (`packages/http/`)
   - Framework adapters (Express, Hono, Next.js)
   - Middleware for protecting routes
   - Paywall UI components

4. **Legacy** (`packages/legacy/`)
   - Reference implementations and previous versions
   - Use as documentation/reference, prefer new mechanisms

### Directory Patterns

- **`src/`** - TypeScript source code
- **`dist/`** - Compiled output (tsup produces ESM + CJS)
- **`test/**/*.test.ts`** - Vitest unit tests (co-locate with source)
- **`vitest.config.ts`** - Test configuration (check integration test variant if exists)
- **`.prettierrc`** - Formatting rules (inherited from workspace)
- **`eslint.config.js`** - Linting rules (typically extends base config)

### Key Dependencies & Integrations

- **@solana/kit** - Solana program interaction
- **viem** - EVM interactions
- **wagmi** - React hooks for EVM
- **zod** - Type-safe schemas (used for paywall definitions)
- **tsup** - Bundling (configured in package.json scripts)
- **vitest** - Testing framework

## Important Development Patterns

### Building & Outputs

TypeScript packages are built with **tsup** producing:
- `dist/esm/` - ES modules (`.mjs` files)
- `dist/cjs/` - CommonJS (`.js` files)
- `dist/*.d.ts` - Type definitions

Turbo caches build outputs; run `turbo prune --docker` to verify dependencies in CI/CD.

### Testing Strategy

- Unit tests co-located with source code
- Run via `pnpm test` (all packages) or per-package
- Integration tests may be in separate config (check `vitest.integration.config.ts`)
- Tests use **vitest** (Vite-based, fast)

### Code Quality

- **ESLint** for code quality (extends @eslint/js)
- **Prettier** for formatting (3.5.2 enforced across all packages)
- **TypeScript strict mode** enforced
- Run `pnpm turbo run format` before committing

### Workspace Dependencies

Packages reference each other using `workspace:*` or `workspace:^` in package.json:
```json
{
  "dependencies": {
    "@x402/core": "workspace:*"
  }
}
```

This ensures local package versions are used during development; releases update to semantic versions.

## Deployment Notes

### Frontend (Vercel)

Vercel config in `vercel.json` rewrites `/api/*` calls to `api/index.py`

### Backend (FastAPI)

API route defined in `api/index.py` (Vercel serverless entry point); main application is `api/main.py`

## Roadmap Context

Project Q1 2026 - Q2 2027: Building from foundational systems (X402 protocol, wallet integration) to full production functionality. Current phase rebuilding on Jarvis_Revamp branch with:
1. Core protocol verification and testing
2. Chain mechanism implementations (SVM, EVM)
3. Frontend wallet UX
4. Backend API services
5. Analytics/introspection layer

## Common Tasks

**Checking TypeScript errors before commit:**
```bash
cd typescript
pnpm turbo run lint:check format:check
```

**Building a single mechanism (e.g., SVM):**
```bash
cd typescript/packages/mechanisms/svm
pnpm build
```

**Testing a specific package:**
```bash
cd typescript/packages/mechanisms/svm
pnpm test:watch
```

**Verifying the full build pipeline:**
```bash
cd typescript
pnpm turbo run build --no-cache
```
