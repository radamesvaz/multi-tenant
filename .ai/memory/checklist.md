# Architecture review checklist

Use this as a fast scan against the diff. Flag only issues supported by the guidelines in `architecture.md`.

## Structure
- [ ] New code lands in the right layer (`app` / `core` / `modules/*` / `shared`)
- [ ] `core/` does not import from `modules/` or `shared/`
- [ ] No new raw `fetch` / HTTP client in Vue SFCs
- [ ] No hard-coded tenant slug in feature logic
- [ ] No dead pages/components left unwired from the router

## Vue / TypeScript
- [ ] SFCs use `<script setup lang="ts">` consistent with the codebase
- [ ] Shared API/domain types come from `core/models` (no duplicate shapes in pages)
- [ ] Env access goes through `envConfig`, not scattered `import.meta.env`
- [ ] Relative imports (no new `@/` alias unless project-wide)

## State & data
- [ ] Domain server state uses the existing Pinia store (or a justified one-off service call)
- [ ] Token / cart keys remain per-tenant via `storageKeys` helpers
- [ ] Store naming follows `use{Scope}{Domain}Store`

## API / auth / tenant
- [ ] Public calls use `/t/{tenant_slug}/…`; authenticated use `/auth/…` + Bearer
- [ ] Payloads/fields match contracts (no invented fields)
- [ ] Admin role / subscription / 401 flows not bypassed
- [ ] Branding colors/logo follow validation + multipart conventions

## UI / quality
- [ ] Loading / error / empty states where the user waits on async work
- [ ] Reuses shared primitives when applicable (`BaseButton`, etc.)
- [ ] No tokens/secrets logged or committed
- [ ] Lint-friendly TypeScript (no casual `any`, no unused junk)

## Security
- [ ] No secrets in client bundles or source
- [ ] User input validated before send where validators already exist
