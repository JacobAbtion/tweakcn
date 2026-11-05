# Progress

## Status

- [x] Phase 0 — Discovery (`docs/ARCHITECTURE-NOTES.md`)
- [x] Phase 1 — Brand palettes — **done, waiting for Jacob's review**
- [ ] Phase 2 — Exports (not started; waits for Jacob's review of Phase 1)

## Checks

- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint` (upstream folders) **and** `npx eslint features app/dev` (`next lint` doesn't scan `features/`)
- Tests: `npm test` (Node test runner via tsx; 37 tests in `features/brand-palettes/*.test.ts`)
- Run: `npm run dev` → `/editor/theme`; scale lab at `/dev/brand-scales`

## Phase 1 plan and status

1. [x] **Scale generator** — `features/brand-palettes/scale.ts` + `naming.ts`, unit tests.
2. [x] **Dev test page** — `/dev/brand-scales` (404 in production). Curve tuned; values in DECISIONS.md.
   Numeric comparison helper: `npx tsx features/brand-palettes/dev/compare.ts`.
3. [x] **Data model + references** — `brandPalettes`/`brandRefs` on `ThemeEditorState` (`types/editor.ts`);
   pure operations in `palette.ts`, React hooks in `use-brand-palettes.ts`. Unit tests.
4. [x] **Brand palettes section** — top of the Colors tab (`components/brand-palettes-section.tsx`,
   `palette-form.tsx`, `step-editor.tsx`).
5. [x] **Brand group in the colour popover** — `components/brand-color-groups.tsx`, wired into
   `color-selector-popover.tsx`; `color-picker.tsx` shows the linked ref + link icon and accepts typed refs.
6. [x] **Browser check** — add palette (with name validation), edit/lock step, link token via popover and by
   typing, step edit propagates to token + live preview, light/dark linked independently, reload keeps
   everything, delete keeps the colour as a plain value, undo restores palette + link.

## Upstream files touched (all marked "Modified by Abtion")

- `types/editor.ts` — two optional fields on `ThemeEditorState`
- `components/editor/colors-tab-content.tsx` — renders the section; passes ref + link handler to pickers
- `components/editor/color-picker.tsx` — shows/accepts a brand ref
- `components/editor/color-selector-popover.tsx` — Brand group at the top
- `README.md` — fork notice; `package.json` — `test` script

## Next (Phase 2, after review)

- CSS export: primitives in `:root`, `var()` references for linked tokens, `@theme inline` registration
  (`utils/theme-style-generator.ts`).
- Registry item including primitives (`utils/registry/themes.ts`, `app/r/themes/[id]`) — note this route
  currently needs a saved theme (DB) or a built-in preset id; local-only themes will need another way in.
- DTCG JSON for Figma + `docs/FIGMA-IMPORT.md`.

## Known issues / limitations

- Existing exports (Code panel, registry) still output resolved colour values only — brand primitives and
  `var()` references arrive in Phase 2.
- Links are dropped whenever something else rewrites the token's value: typing a colour, applying a preset,
  HSL adjustments, AI generation, CSS import. Palettes themselves survive all of these. (By design; see
  DECISIONS.md.)
- Sidebar "Sync": linking a base token while Sync is on links the sidebar token too. Turning Sync on *after*
  linking copies the colour only (no link) — tweakcn's sync copies values.
- The shadow colour picker shows the Brand group, but picking a step sets a plain colour (no link).
- Upstream behaviour, unchanged: the token text field applies whatever you type after a short pause, so
  typing a brand ref very slowly briefly applies the partial text.
- Upstream hydration warnings / "Unauthorized" / 500s in the console are pre-existing (saved theme differs
  from server render; no auth/DB configured).
- `package-lock.json` was already modified by the local `npm install` before this work started; left
  uncommitted.
