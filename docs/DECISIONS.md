# Decisions

One line each: what, why.

## Phase 0

- **License is Apache 2.0, not MIT** — acceptable (per Jacob). Keep `LICENSE` intact (there is no `NOTICE` file), add a `Modified by Abtion` comment at the top of every tweakcn file we change, and a "modified fork" line in the README (Apache 2.0 §4b requires modified files to say so).
- **npm, not pnpm** — upstream ships `pnpm-lock.yaml`, but pnpm isn't installed here and `node_modules` came from npm. We avoid adding dependencies so neither lockfile needs to change.
- **No services stubbed** — the theme editor runs without `.env`; auth/DB/AI calls fail quietly ("Unauthorized"), which doesn't affect editing.
- **Dev server config** in `.claude/launch.json` (`npm run dev`).

## Phase 1

- **New code lives in `features/brand-palettes/`** — the repo has no `src/`; a top-level feature folder keeps our code apart from upstream files for easy merging.
- **Tests use Node's built-in test runner via `tsx`** (`node --import tsx --test`) — `tsx` is already a devDependency, so no new test framework (vitest/jest) is added to the lockfiles.
- **References are stored next to the values, not instead of them** — `ThemeEditorState.brandRefs = { light: {token: "forest-green-700"}, dark: {...} }`, while `styles` keeps the resolved colour string. Smallest change: the preview, the existing CSS export, the contrast checker, AI and presets keep working on plain strings untouched.
- **A reference is only "live" while the token's value still equals the step's value** — if anything else changes the token (typing a colour, a preset, HSL adjustments, AI), the link is silently dropped instead of overwriting that change. Avoids hooking into every upstream code path that writes styles.
- **`package.json` has no "Modified by Abtion" comment** — JSON can't hold comments; the only change is the `test` script.
- **Gamut mapping uses culori `clampChroma` (constant L and H), not `toGamut`** — `toGamut` ends with an RGB clip that shifted the hue of light tints by up to ~14° (blue-100 went cyan), breaking "hue stays H_b".
- **Anchor OKLCH string uses as many decimals as needed (4–12)** to round-trip to the exact hex *and* stay inside sRGB (edge colours like `#00FF00` need more than 4).
- **Lightness bounds 0.995 (max) / 0.13 (min)** — when enforcing the 0.015 gap pushes a step past these (e.g. a near-white brand colour anchored at 100), the free steps between the anchor and the end are spaced evenly in the room left instead.
- **Anchor ties go to the lighter step.**
- **Scale curve tuning (final values, `DEFAULT_SCALE_CONFIG` in `features/brand-palettes/scale.ts`)** — scored on 10 brand colours by how even the perceptual distance (OKLab ΔE) is between neighbouring steps 100→950. The spec's starting values had a visible jump at step 400 (300→400 lightness gap of 0.10). Tuned values cut the unevenness (coefficient of variation) from 0.21 to 0.12; the biggest remaining jump is next to the brand colour itself, which is fixed by definition. Helper script: `npx tsx features/brand-palettes/dev/compare.ts`.

  | Step | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | L | 0.977 | 0.937 | 0.877 | 0.800 | 0.716 | 0.635 | 0.556 | 0.480 | 0.410 | 0.347 | 0.270 |
  | m | 0.14 | 0.30 | 0.54 | 0.78 | 0.92 | 1.0 | 1.0 | 0.97 | 0.88 | 0.78 | 0.68 |
- **Muted brand colours stay muted** — chroma is scaled relative to the brand colour (as specced), so a dusty dark green gives a sage-like 500 rather than a vivid Tailwind-emerald 500. Kept deliberately: it preserves the brand's character. Revisit if Jacob wants more vivid mid-tones.
- **Editing one step changes only that step** — it gets locked; nothing else regenerates. Regeneration only happens on a base colour change or a Reset. Otherwise editing the anchor swatch would silently move the brand hex to a neighbour.
- **Hand-edited (locked) steps don't push generated steps around** — the curve is computed as if nothing were locked and locked values are swapped in at the end. An odd override (e.g. 900 set to a light colour) stays a local exception instead of reflowing the whole palette. Consequence: with overrides, strict lightness order is the user's responsibility.
- **Anchor edge cases** — base colour change with the new natural anchor locked → the nearest unlocked step (tie → closest target L) holds the base hex (spec rule). Reset step / Reset all → keep the current anchor if the natural one is still locked, so resetting one step never moves the brand colour around. Resetting the anchor step itself puts the base hex back there.
- **Reset step regenerates the whole palette from the same inputs** — results are deterministic, so other unlocked steps only change when the anchor moves back (e.g. after resetting a locked natural anchor).
- **References are strings like `forest-green-700`**, rewritten when a palette is renamed. Not palette ids: matches the CSS/Figma names we'll export, and it stays open to a third layer (component tokens) using the same shape.
- **Hand-typed step colours are stored as given (converted to OKLCH), not gamut-mapped** — the designer's explicit choice wins; hex input keeps exact round-tripping.
- **IDs use `crypto.randomUUID()`** (fallback to a timestamp+random id).
- **Pre-existing lint errors in `types/editor.ts`** (`any` on lines 40–41, upstream code, outside `next lint`'s default folders) are left alone; we lint `features/` explicitly with `npx eslint features`.
- **UI placement** — "Brand palettes" is the first section of the Colors tab (tweakcn's `ControlSection`, expanded, with an "+ Add" header action styled like the Sidebar "Sync" button). Hidden while the colour search box has text.
- **Step editing happens in a popover** on each swatch (picker, hex/oklch field, contrast vs white and black with AA/AAA labels, "Used by …" list, Reset when edited). Swatch tooltips also show contrast. Anchor = small dot, edited = lock icon; the palette header shows the number of edited steps.
- **Palette menu** (⋯): Rename, Change base colour, Reset all overrides, Delete. Delete has no confirmation dialog because tweakcn's undo restores it, links included.
- **Brand group lists one group per palette** ("Brand · Forest Green") above Tailwind's colours in both list and grid views; brand steps are searchable by ref and palette name.
- **Linked tokens show the ref in their text field** (e.g. `forest-green-700`) plus a link icon; typing a ref there links it too. Typing any other colour unlinks.
- **Linking respects the Sidebar "Sync" toggle** — linking a base token while Sync is on also links its sidebar counterpart.
- **Dev lab page at `/dev/brand-scales`**

## Phase 1 adjustments

### Only the preview is themed

- **Page root gets tweakcn's default neutral theme** (`components/theme-provider.tsx` → `neutralEditorState`, and `components/theme-script.tsx` for the pre-load paint). It still follows the editor's light/dark toggle, which is the edited theme's `currentMode`, so the editor and the preview always show the same mode.
- **The edited theme is scoped to the preview area** — `features/preview-scope/PreviewThemeScope` replaces the preview `<section>` in `theme-preview-panel.tsx` and writes the theme's CSS variables onto it (own `applyScopedTheme`, because upstream `applyThemeToElement` also writes shadows and the `dark` class to the document root). Works because globals.css uses `@theme inline`, so utilities read `var(--primary)` at the element. The scope also sets `bg-background text-foreground font-sans tracking-normal`, which used to come from `body`.
- **Portals: a themed, body-level portal container + React context** — `PreviewThemeScope` creates `<div data-preview-portal-root>` in `<body>`, applies the same theme to it, and provides it via context. The 12 portal-using `components/ui/*` files pass `container={usePreviewPortalContainer()}` to their Radix/vaul `Portal`. Outside the preview the context is `undefined`, so the editor's own popovers render into `<body>` as before. Chosen over a portal container *inside* the preview so overlays aren't clipped by the preview's `overflow: hidden` / stacking context.
- **Verified:** primary, background and radius change only in the preview; dropdown, select, sheet (dialog) and tooltip opened from the preview are themed; the editor's colour popover stays neutral; light/dark both work.
- **Not themed any more (accepted):** the homepage preset showcase, `/themes/[id]` and the AI chat theme previews relied on the page-level theme and now render neutral. None are part of our workflow (the last two need DB/AI). Sonner toasts render at page level, so a toast triggered from the preview is neutral. — returns 404 when `NODE_ENV=production`.
- **Names that are blocked:** Tailwind colour names (incl. black/white/transparent/current/inherit and the newer mauve/olive/mist/taupe), shadcn token roots (`primary`, `chart`, `sidebar`, …, so you never get `primary-500` next to `primary`), names not starting with a letter, and names ending in `-<number>` (would read like a step).
- **Slugs transliterate Danish letters** (æ→ae, ø→o, å→a) and strip accents.
- **Palettes and refs are part of `ThemeEditorState`** — so they persist in `localStorage` (`editor-storage`) with the working theme and take part in undo/redo, with no store changes.
