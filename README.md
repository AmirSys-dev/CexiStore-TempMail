# Cexistore Tempmail Web

Frontend dashboard and landing experience for Cexistore (Vite + React), with Express backend APIs under `server/`.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Changelog

### 2026-04-15 — Full Visual Rollback (Original Design Direction)

- Restored frontend visual direction to a simpler original-style look (monochrome/neutral, reduced decorative gradients).
- Reworked global UI shell:
  - Simplified navbar (desktop + mobile) with classic flat styling.
  - Neutralized global mesh/glass visual effects.
- Rebuilt landing/auth/static visual presentation to be cleaner and less flashy.
- Rolled back dashboard/admin/tools/hosting/pricing/api-docs styling to match the original simpler design language while preserving all existing logic and API behavior.
- Updated code block presentation in API docs to a cleaner, less decorative style.

### 2026-04-15 — Mobile UX + Feature Decommission Update

- Fixed mobile layout issues on Landing page (hero spacing, CTA stacking, stats/cards spacing).
- Fixed mobile navbar/drawer behavior for cleaner navigation on small screens.
- Removed **Signal/Stresser** feature completely from frontend:
  - Removed dashboard Signal tab and UI flow.
  - Removed `/stresser` route and page exposure.
  - Removed stresser references from pricing copy.
- Removed backend endpoint: `/api/attack/local`.
- Updated button theme accents to black for a cleaner visual style.

### 2026-04-15 — Vault Reliability Update

- Improved profile bootstrap resilience to avoid false zero-state Vault data.
- Added explicit Vault loading/error/retry states in dashboard.
- Hardened profile bootstrap fallback for accounts with missing direct email input.
