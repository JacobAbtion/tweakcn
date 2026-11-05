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
- **Names that are blocked:** Tailwind colour names (incl. black/white/transparent/current/inherit and the newer mauve/olive/mist/taupe), shadcn token roots (`primary`, `chart`, `sidebar`, …, so you never get `primary-500` next to `primary`), names not starting with a letter, and names ending in `-<number>` (would read like a step).
- **Slugs transliterate Danish letters** (æ→ae, ø→o, å→a) and strip accents.
- **Palettes and refs are part of `ThemeEditorState`** — so they persist in `localStorage` (`editor-storage`) with the working theme and take part in undo/redo, with no store changes.
