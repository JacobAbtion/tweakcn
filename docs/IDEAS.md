# Ideas

Not in scope; noted for later.

- **"Vivid mid-tones" option** for muted brand colours: scale chroma relative to the sRGB maximum at each
  lightness, so a dusty dark green can still produce a vivid 400–600 (closer to Tailwind's emerald).
- **Reorder palettes** (drag and drop; `@dnd-kit` is already a dependency).
- **Show unlinked tokens that exactly match a brand step** and offer to link them.
- **Sidebar Sync copies links**, not just values.
- **Dedicated hover tokens per role** (e.g. `--primary-hover` from the next step of the primary palette) — part of Phase 4 component tokens; today shadcn components derive hover in-component (`bg-primary/90`).
- **Neutral tint control** — near-grey brand neutrals (chroma < 0.02) keep their chroma on every step, so a warm grey's 50 reads slightly peach as a page background. An option to fade chroma towards 50/950 for neutrals.
- **Per-token rule editing** — let the designer change a token's rule (e.g. ring → Primary 300) instead of only overriding its colour.
