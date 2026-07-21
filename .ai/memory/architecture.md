# Multi-Tenant Frontend — Architecture & Philosophy

This document is the source of truth for local AI architecture review.
Judge code against these rules. Prefer **this project’s conventions** over generic Vue/TypeScript advice when they conflict. Generic best practices apply when they reinforce the structure below.

**Stack:** Vue 3 (`<script setup lang="ts">`) · TypeScript (strict) · Vite · Pinia · Vue Router · native `fetch` (no Axios).

**Product:** One SPA with a public storefront and a tenant admin panel, both multi-tenant via `tenant_slug`.

---

## Purpose

Deliver a mobile-first SPA where:

- Customers browse products and place orders under `/t/{tenantSlug}/…`
- Tenant admins manage products, orders, branding, invitations, and subscription-aware access under `/admin/*`
- All HTTP respects backend contracts in `markdowns/` (API MVP, branding, signup, invitations)

---

## Layering & folder ownership

```text
src/
  app/          # Bootstrap + root router only (no business logic)
  core/         # Framework-agnostic infra: config, models, services, auth APIs, utils, validation
  modules/
    public/     # Storefront UI, pages, local Pinia stores
    admin/      # Admin UI, pages, local Pinia stores, admin routes
  shared/       # Cross-cutting UI, composables, global Pinia (auth/tenant/subscription)
```

### Allowed dependency directions

| From | May import |
|------|------------|
| `app/` | `core/`, `shared/`, `modules/*/router`, page lazy imports |
| `modules/public/` | `core/`, `shared/` |
| `modules/admin/` | `core/`, `shared/` (public UI only when intentionally reusing storefront visuals, e.g. branding preview) |
| `shared/` | `core/` |
| `core/` | other `core/` only — **never** Vue components, Pinia stores, or modules |

### Forbidden

- Business logic or `fetch` inside `app/providers` beyond mounting Pinia/router
- Pages/components inventing new HTTP clients; prefer `core/services` (+ documented `core/auth/*Api` helpers)
- `modules/public` owning admin auth/token logic (and vice versa)
- `core/` importing from `modules/` or `shared/`
- Hard-coding a single tenant slug in feature code (use route param, `useCurrentTenant`, or `authStore.getActiveAdminTenantSlug()`)
- New path aliases (`@/`) unless the whole project is migrated — today uses **relative imports**
- Axios / extra HTTP libraries when `fetch` + `httpRequest` already cover the case

---

## Vue conventions (project + best practice)

- Use **Composition API** with `<script setup lang="ts">` for all new SFCs.
- Prefer **named components** via `defineOptions({ name: '…' })` for shared primitives.
- Keep templates thin: derive UI state in setup; put server mutations in Pinia stores or services.
- **Co-locate styles:** `Foo.vue` + `Foo.css` next to each other (existing pattern).
- Prefer **shared primitives** (`BaseButton`, `BaseLink`, `ProductSearchBar`, `AppSnackbar`) over one-off button/link markup.
- Route components: lazy-load pages with `() => import('…')` (already the router pattern).
- Do not put large domain logic in layout components beyond tenant shell concerns (branding CSS vars, nav, gates).

---

## TypeScript conventions

- Keep `strict` satisfaction: no `any` unless unavoidable and localized; prefer typed models from `core/models`.
- Export shared types/interfaces from `core/models` — do not redefine API shapes in pages.
- Prefer explicit return types on exported functions in `core/` and stores when it clarifies contracts.
- Respect unused-locals/params: do not leave dead imports or stub parameters.
- Env access only through `envConfig` (`core/config`) — never sprinkle `import.meta.env` in pages/stores.

---

## State & data (Pinia)

| Store | Location | Owns |
|-------|----------|------|
| `auth` | `shared/store/auth.ts` | Per-tenant JWT (`token:{slug}`), admin tenant context |
| `tenant` | `shared/store/tenant.ts` | Public branding load + unavailable/error flags |
| `subscription` | `shared/store/subscription.ts` | Admin subscription context / canceled gate |
| `admin-products` | `modules/admin/store/products.ts` | Admin catalog list/CRUD |
| `admin-orders` | `modules/admin/store/orders.ts` | Admin order list/updates |
| `public-products` | `modules/public/store/products.ts` | Public catalog pagination + selection |
| `cart` | `modules/public/store/cart.ts` | Cart + `localStorage` per tenant |

### Rules

- Naming: `use{Scope}{Domain}Store` (e.g. `useAdminProductsStore`, `usePublicProductsStore`).
- List/detail server state for a domain should live in that domain’s store when the flow is reused.
- One-off flows may call `core/services` from a page (e.g. checkout) — do not invent a second parallel HTTP path.
- Do not duplicate token key helpers; use `shared/constants/storageKeys.ts` (`tokenStorageKey`, `ADMIN_TENANT_CONTEXT_KEY`).
- Cart/auth persistence keys must remain **per-tenant**.

---

## Routing & tenant context

### Public storefront

- Paths under `/t/:tenantSlug/…`
- Resolve slug via `useCurrentTenant()` (route param → fallback `envConfig.defaultTenantSlug`)
- Pass `tenantSlug` into store actions and public API helpers explicitly

### Admin

- Protected app routes under `/admin/*` (slug **not** in path)
- Login / guest auth routes may include `:tenantSlug` (e.g. `admin-login`, password reset, invitations)
- Active tenant from `authStore.getActiveAdminTenantSlug()` (localStorage) when route has no slug
- Guards in `app/router/index.ts`: auth → admin role (`role_id === 1`) → subscription canceled handling

### Forbidden

- Assuming tenant from a global constant in feature code
- Calling `/auth/*` without Bearer token when the endpoint requires auth
- Using platform/superadmin login flows for normal tenant admin UX unless explicitly building that tool

---

## API & auth

### HTTP entry points

1. **Preferred:** `core/services/index.ts` — `authService`, `productService`, `orderService`, `tenantService`, `invitationService`, shared `httpRequest`
2. **Auth helpers:** `core/auth/*Api.ts` for login, branding GET, invitations, password reset, subscription — keep new auth endpoints grouped here or re-exported through services
3. **Never:** raw `fetch` in Vue SFCs for new work

### Path conventions (must match backend)

| Kind | Pattern |
|------|---------|
| Public / path-tenant | `/t/{tenant_slug}/…` (products, orders create, branding, auth login/register) |
| Authenticated | `/auth/…` — tenant from JWT `tenant_id`, send `Authorization: Bearer <token>` |
| Errors | Prefer parsing `{ error, code }` when present; show friendly UI messages |

### Contracts

- Follow `markdowns/API_MVP_CONTRACT.md` and feature contracts (`FRONTEND_API_CONTRACT_*`, `TENANT_BRANDING_CONTRACTS.md`, etc.).
- Do not invent request/response fields. Align with live backend if a markdown disagrees — note the mismatch in the review instead of “fixing” to a wrong doc inventively.
- Branding colors: `#RRGGBB` validated client-side (`core/utils/tenantBranding.ts`) before PATCH.
- Logo upload: multipart field `logo` to the branding logo endpoint.
- Do not invent branding colors client-side; use empty branding until API succeeds.
- Public product search `q`: only send when length ≥ 2 (existing service rule).
- On 401: clear tenant token and redirect to admin login (`redirectOnUnauthorized`).
- Subscription canceled: honor existing `SubscriptionCanceledError` / redirect flow — do not silently ignore.

### Security

- No secrets, API keys, or long-lived credentials in client source or commits (`.env` is gitignored; only `VITE_*` public config).
- Do not `console.log` tokens or full Authorization headers.
- Treat user input as untrusted; validate email/password/colors before send (`core/validation`, branding utils).
- JWT is decoded client-side for `exp` / `role_id` only — never treat client decode as server authorization.

---

## UI / UX conventions

- Mobile-first layouts; admin and public shells stay consistent with existing layouts.
- Apply tenant theme via CSS variables (`--tenant-primary`, `--tenant-secondary`, `--tenant-accent`) on the public shell.
- Loading / error / empty states for async lists and mutations that users wait on.
- Prefer existing snackbar/notification patterns over new toast libraries.
- Accessibility baseline: semantic buttons/links, labels on inputs, do not rely on color alone for status.

---

## Testing & quality

- Tooling present: Vitest, Vue Test Utils, ESLint, Prettier.
- New non-trivial logic in `core/` (parsers, validators, JWT helpers) should be testable pure functions; add Vitest coverage when changing behavior there.
- UI changes: at minimum keep `npm run lint` clean for touched files.
- Do not add dead pages that are not registered in the router.

---

## Style

- Match existing naming: PascalCase SFCs, camelCase TS, Pinia ids as today (`auth`, `admin-products`, …).
- Barrel files (`index.ts`) for shared/store/components when the folder already uses them.
- Prefer small, focused composables under `shared/composables` with `use*` names.
- Keep diffs focused: no drive-by refactors unrelated to the change.
- Comments only for non-obvious intent (tenant edge cases, API quirks) — not narration.

---

## Review stance

When reviewing a diff:

1. Prefer **consistency with current folders and stores** over idealized greenfield architecture.
2. Flag only issues evidenced by the diff and these guidelines.
3. Suggest the smallest fix that restores layering / tenant / contract correctness.
