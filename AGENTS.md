# AGENTS Guide for `ojt-tracker-app`

This guide is for autonomous coding agents operating in this repository.
It documents current commands, conventions, and guardrails based on the codebase as of today.

## 1) Project Overview

- Monorepo-style JavaScript app with two parts:
  - Frontend: React + Vite at repository root
  - Backend: Express + MongoDB in `backend/`
- Package manager: `npm` (root lockfile: `package-lock.json`)
- Language: JavaScript (no TypeScript setup)
- Linting: ESLint configured at root (`eslint.config.js`)
- Tests: no real test framework configured yet

## 2) Important Paths

- `src/` frontend source
- `src/pages/` page-level React components (`Login`, `Dashboard`, `Terms`)
- `backend/server.js` API server, auth flow, records API, uploads
- `public/` static assets
- `eslint.config.js` lint config
- `vite.config.js` Vite config
- `tailwind.config.js`, `postcss.config.js` styling pipeline

## 3) Install and Run

Run from repository root unless specified.

```bash
npm install
npm --prefix backend install
```

Start frontend:

```bash
npm run dev
```

Start backend:

```bash
npm --prefix backend run dev
```

Build/preview style run:

```bash
npm run build
npm run preview
npm --prefix backend run start
```

## 4) Build, Lint, and Test Commands

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Current test status:
- Frontend has no configured test runner or `test` script.
- Backend `test` script is placeholder only and intentionally fails.

Backend placeholder test command:

```bash
npm --prefix backend test
```

## 5) Running a Single Test (Critical)

There is no working single-test command today because no test framework exists.
Do not claim tests passed unless a real runner is added.

If a framework gets introduced later, use one of these patterns:
- Vitest: `npx vitest path/to/file.test.js -t "test name"`
- Jest: `npx jest path/to/file.test.js -t "test name"`
- Node test runner: `node --test path/to/file.test.js`

When adding test tooling, also update this file and `package.json` scripts.

## 6) Environment Variables

Backend reads `.env` via `dotenv`.

- `PORT` (default `5000`)
- `JWT_SECRET` (code has fallback; use proper secret in real env)
- `GOOGLE_CLIENT_ID`
- `MONGODB_URI` (default local MongoDB URI)

Security requirements for agents:
- Never commit real secrets.
- Never print tokens/secrets in logs or responses.
- Prefer documenting required env vars over hardcoding.

## 7) Code Style and Conventions

### Imports
- Keep imports at the top.
- Prefer this grouping order: external libs, internal modules, styles/side-effects.
- Keep imports used; remove unused imports.

### Formatting
- Follow existing local file style before making broad formatting changes.
- JSX files commonly use semicolons and single quotes; match surrounding code.
- Config files may omit semicolons; preserve local style.
- Avoid unrelated formatting-only diffs.

### Types / Data Safety (JS project)
- Use runtime validation and guards for optional/missing values.
- Normalize numeric payload values (`parseFloat`, `parseInt`) before persistence.
- Keep API response shapes stable to avoid frontend breakage.
- Guard `localStorage` reads and parsed JSON usage.

### Naming
- Components/models: `PascalCase` (`Dashboard`, `User`, `Record`).
- Variables/functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants (`API_URL`).
- Route paths: lowercase URL segments.

### React
- Use function components with hooks.
- Keep auth and route guards explicit (e.g., token checks, protected routes).
- Keep form state controlled and local unless sharing is required.
- Preserve existing UX behavior unless user asks for changes.

### Express / Backend
- Use async handlers with `try/catch`.
- Return meaningful status codes (`400`, `401`, `404`, `500`).
- Keep auth validation centralized in middleware (`verifyToken`).
- Validate request body assumptions before DB writes.
- Keep upload logic aligned with expected field `documentaries` and `/uploads` static serving.

### Error Handling and Logging
- Frontend: set user-facing error state on async failures.
- Backend: log internal failures, but keep client responses concise and safe.
- Never leak credentials or token values in logs/responses.

## 8) API/Auth Behavior to Preserve

- Use `Authorization: Bearer <token>` format consistently.
- On `401` responses in frontend, clear auth state and redirect to login.
- Keep JWT expiry and auth flow behavior consistent unless explicitly changed.

## 9) Cursor and Copilot Rules

Checked paths:
- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

Current status: none of these rule files exist in this repository.

Agent instruction:
- Re-check these locations before large edits.
- If present later, treat them as higher-priority local instructions.

## 10) Agent Working Checklist

- Install dependencies for root and backend.
- Run lint for frontend changes: `npm run lint`.
- Run build for substantial frontend changes: `npm run build`.
- Do not fabricate test results; clearly state test limitations.
- Prefer minimal, targeted diffs; avoid unrequested refactors.
- If adding tools/frameworks, update scripts and this guide.
