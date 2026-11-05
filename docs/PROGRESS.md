# Progress

## Status

- [x] Phase 0 — Discovery (`docs/ARCHITECTURE-NOTES.md`)
- [ ] Phase 1 — Brand palettes (in progress)
- [ ] Phase 2 — Exports (not started; waits for Jacob's review of Phase 1)

## Phase 1 plan

Each step: typecheck (`npx tsc --noEmit`), lint (`npm run lint`), test (`npm test`), commit, update this file.

1. [ ] **Scale generator** — `features/brand-palettes/scale.ts`: pure module (culori only). Generate 50–950 from
   a hex, anchor detection, curve bending, chroma taper, gamut mapping, locked steps respected, slug + name
   validation. Unit tests with `node:test` (`npm test`).
2. [ ] **Dev test page** — `/dev/brand-scales` (404 in production): the five sample colours next to Tailwind's
   own scales, with L/C read-outs. Tune the curve; log final values in DECISIONS.md. → send Jacob the URL.
3. [ ] **Data model + references** — `brandPalettes` and `brandRefs` on `ThemeEditorState`; pure helpers to
   add/rename/delete palettes, edit/lock/reset steps, link/unlink tokens, and propagate step changes to
   linked tokens. Unit tests.
4. [ ] **Brand palettes section** — at the top of the Colors tab: list, "Add brand colour" (name + hex, inline
   validation), 11-swatch rows, step editor popover (picker + hex/oklch input, lock, reset, contrast vs
   white/black), palette menu (rename, change base colour, reset all overrides, delete).
5. [ ] **Brand group in the colour picker popover** — at the top of tweakcn's Tailwind colour popover; selecting a
   step links the token in the current mode. Linked tokens show their reference (e.g. `forest-green-700`) in
   the picker row; typing a brand ref in the text input links too.
6. [ ] **End-to-end check in the browser** — 3–4 palettes, link tokens in light + dark, change a step and see the
   preview update, reload, delete a palette (tokens keep their colour), undo/redo.

## Done log

- Phase 0: license checked (Apache 2.0), app runs locally with no services, architecture notes written.

## Known issues

- `package-lock.json` was already modified by the local `npm install` before this work started; left as is.
