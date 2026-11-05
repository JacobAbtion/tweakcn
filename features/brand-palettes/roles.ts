/**
 * Roles: assign brand palettes to Primary / Secondary / Neutral / Destructive, and every shadcn colour
 * token follows a rule (role + step per mode, with contrast checks). Pure module.
 *
 * State lives in `brandRoles` on the editor state:
 * - `assignments`: role → palette id
 * - `auto[mode][token]`: what the rule last wrote (value, brand ref, label, warning)
 * - `manual[mode]`: tokens the user has taken over
 *
 * A token is detected as Manual when its current value differs from what the rule last wrote, unless
 * it still points to the same brand step (a palette edit moved the value, not the user). Manual tokens
 * keep their value through role changes until reset to Auto.
 */
import { wcagContrast } from "culori";
import { getActiveRef, refFor, type BrandState } from "./palette";
import { SCALE_STEPS, type ScaleStep } from "./scale";
import type { BrandPalette, BrandRefs, Mode } from "./types";

export const ROLES = ["primary", "secondary", "neutral", "destructive"] as const;
export type RoleId = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleId, string> = {
  primary: "Primary",
  secondary: "Secondary",
  neutral: "Neutral",
  destructive: "Destructive",
};

export const WHITE = "oklch(1 0 0)";
/** WCAG thresholds */
export const TEXT_CONTRAST = 4.5;
export const UI_CONTRAST = 3;

type StepPick = ScaleStep | "anchor";
type MinContrast = { against: string; ratio: number; towards: "lighter" | "darker" };

export type ModeRule =
  /** a step of the role's palette; optionally walk lighter/darker until it contrasts enough with another token */
  | { kind: "step"; pick: StepPick; min?: MinContrast; warnBelow?: Omit<MinContrast, "towards">; whiteOption?: boolean }
  /** a foreground for `on`: `prefer` if it reaches 4.5:1, else the best of white / 50 / 950 */
  | { kind: "on"; on: string; prefer?: ScaleStep }
  /** same value (and reference) as another token */
  | { kind: "mirror"; token: string };

export type TokenRule = { role: RoleId; light: ModeRule; dark: ModeRule };

const step = (pick: StepPick, extra: Partial<Extract<ModeRule, { kind: "step" }>> = {}): ModeRule => ({
  kind: "step",
  pick,
  ...extra,
});
const on = (token: string, prefer?: ScaleStep): ModeRule => ({ kind: "on", on: token, prefer });
const mirror = (token: string): ModeRule => ({ kind: "mirror", token });
const darkUI = (against = "background"): MinContrast => ({ against, ratio: UI_CONTRAST, towards: "lighter" });
const lightUI = (against = "background"): MinContrast => ({ against, ratio: UI_CONTRAST, towards: "darker" });

/**
 * Default rules, in resolution order (a rule may only depend on tokens listed above it).
 * Final table documented in docs/DECISIONS.md ("Token rules").
 */
export const TOKEN_RULES: Record<string, TokenRule> = {
  background: { role: "neutral", light: step(50, { whiteOption: true }), dark: step(950) },
  card: { role: "neutral", light: step(50, { whiteOption: true }), dark: step(900) },
  popover: { role: "neutral", light: step(50, { whiteOption: true }), dark: step(900) },
  foreground: { role: "neutral", light: step(950), dark: step(50) },
  "card-foreground": { role: "neutral", light: step(950), dark: step(50) },
  "popover-foreground": { role: "neutral", light: step(950), dark: step(50) },
  muted: { role: "neutral", light: step(100), dark: step(800) },
  "muted-foreground": {
    role: "neutral",
    light: step(600, { min: { against: "background", ratio: TEXT_CONTRAST, towards: "darker" } }),
    dark: step(400, { min: { against: "background", ratio: TEXT_CONTRAST, towards: "lighter" } }),
  },
  border: { role: "neutral", light: step(200), dark: step(800) },
  input: { role: "neutral", light: step(200), dark: step(800) },

  primary: {
    role: "primary",
    light: step("anchor", { warnBelow: { against: "background", ratio: UI_CONTRAST } }),
    dark: step("anchor", { min: darkUI() }),
  },
  "primary-foreground": { role: "primary", light: on("primary"), dark: on("primary") },
  ring: { role: "primary", light: step(400), dark: step(500) },

  secondary: { role: "secondary", light: step(100), dark: step(800) },
  "secondary-foreground": { role: "secondary", light: on("secondary", 900), dark: on("secondary", 100) },
  accent: { role: "secondary", light: step(100), dark: step(800) },
  "accent-foreground": { role: "secondary", light: on("accent", 900), dark: on("accent", 100) },

  destructive: {
    role: "destructive",
    light: step(600, { min: lightUI() }),
    dark: step(400, { min: darkUI() }),
  },
  "destructive-foreground": { role: "destructive", light: on("destructive"), dark: on("destructive") },

  // Series alternate palette and lightness so neighbours are easy to tell apart.
  "chart-1": { role: "primary", light: step(600), dark: step(400) },
  "chart-2": { role: "secondary", light: step(400), dark: step(300) },
  "chart-3": { role: "primary", light: step(800), dark: step(200) },
  "chart-4": { role: "secondary", light: step(700), dark: step(600) },
  "chart-5": { role: "primary", light: step(300), dark: step(700) },

  sidebar: { role: "neutral", light: mirror("background"), dark: mirror("background") },
  "sidebar-foreground": { role: "neutral", light: mirror("foreground"), dark: mirror("foreground") },
  "sidebar-primary": { role: "primary", light: mirror("primary"), dark: mirror("primary") },
  "sidebar-primary-foreground": {
    role: "primary",
    light: mirror("primary-foreground"),
    dark: mirror("primary-foreground"),
  },
  "sidebar-accent": { role: "secondary", light: mirror("accent"), dark: mirror("accent") },
  "sidebar-accent-foreground": {
    role: "secondary",
    light: mirror("accent-foreground"),
    dark: mirror("accent-foreground"),
  },
  "sidebar-border": { role: "neutral", light: mirror("border"), dark: mirror("border") },
  "sidebar-ring": { role: "primary", light: mirror("ring"), dark: mirror("ring") },
};

export type AutoEntry = {
  value: string;
  /** brand reference, absent when the rule resolved to white */
  ref?: string;
  /** e.g. "Primary 700", "White", "Same as primary" */
  label: string;
  /** contrast problem the rule couldn't solve */
  warning?: string;
};

export type BrandRoles = {
  assignments: Partial<Record<RoleId, string>>;
  /** Light-mode background/card/popover: pure white instead of Neutral 50 */
  whiteBackground?: boolean;
  auto: { light: Record<string, AutoEntry>; dark: Record<string, AutoEntry> };
  manual: { light: string[]; dark: string[] };
};

export type RoleState = BrandState & { brandRoles?: BrandRoles };

const MODES: Mode[] = ["light", "dark"];

export const emptyRoles = (): BrandRoles => ({
  assignments: {},
  auto: { light: {}, dark: {} },
  manual: { light: [], dark: [] },
});

const contrast = (a: string, b: string) => {
  try {
    return wcagContrast(a, b);
  } catch {
    return 1;
  }
};
const fmt = (r: number) => r.toFixed(2).replace(/\.?0+$/, "");

type Ctx = {
  palette: BrandPalette;
  roleLabel: string;
  styles: Record<string, unknown>;
  refs: BrandRefs[Mode];
  mode: Mode;
  whiteBackground: boolean;
};

const fromStep = (ctx: Ctx, s: ScaleStep): AutoEntry => ({
  value: ctx.palette.steps[s].value,
  ref: refFor(ctx.palette.slug, s),
  label: `${ctx.roleLabel} ${s}`,
});

export function resolveRule(rule: ModeRule, ctx: Ctx): AutoEntry {
  if (rule.kind === "mirror") {
    const value = String(ctx.styles[rule.token] ?? "");
    const ref = ctx.refs[rule.token];
    return { value, ...(ref ? { ref } : {}), label: `Same as ${rule.token}` };
  }

  if (rule.kind === "on") {
    const bg = String(ctx.styles[rule.on] ?? "");
    if (rule.prefer !== undefined) {
      const preferred = fromStep(ctx, rule.prefer);
      if (contrast(preferred.value, bg) >= TEXT_CONTRAST) return preferred;
    }
    const candidates: AutoEntry[] = [
      { value: WHITE, label: "White" },
      fromStep(ctx, 50),
      fromStep(ctx, 950),
    ];
    const best = candidates.reduce((a, b) => (contrast(b.value, bg) > contrast(a.value, bg) ? b : a));
    const ratio = contrast(best.value, bg);
    return ratio >= TEXT_CONTRAST
      ? best
      : { ...best, warning: `Only ${fmt(ratio)}:1 against ${rule.on} (text needs 4.5:1).` };
  }

  // kind === "step"
  if (rule.whiteOption && ctx.mode === "light" && ctx.whiteBackground) return { value: WHITE, label: "White" };
  const start = rule.pick === "anchor" ? ctx.palette.anchorStep : rule.pick;
  let result = fromStep(ctx, start);

  if (rule.min) {
    const against = String(ctx.styles[rule.min.against] ?? "");
    const i0 = SCALE_STEPS.indexOf(start);
    const dir = rule.min.towards === "lighter" ? -1 : 1;
    let best = result;
    let bestRatio = contrast(result.value, against);
    let found = bestRatio >= rule.min.ratio;
    for (let i = i0 + dir; !found && i >= 0 && i < SCALE_STEPS.length; i += dir) {
      const candidate = fromStep(ctx, SCALE_STEPS[i]);
      const r = contrast(candidate.value, against);
      if (r > bestRatio) {
        best = candidate;
        bestRatio = r;
      }
      if (r >= rule.min.ratio) found = true;
    }
    result = found
      ? best
      : {
          ...best,
          warning: `Only ${fmt(bestRatio)}:1 against ${rule.min.against} (needs ${rule.min.ratio}:1).`,
        };
  }

  if (rule.warnBelow) {
    const ratio = contrast(result.value, String(ctx.styles[rule.warnBelow.against] ?? ""));
    if (ratio < rule.warnBelow.ratio) {
      result = {
        ...result,
        warning: `Only ${fmt(ratio)}:1 against ${rule.warnBelow.against} (needs ${rule.warnBelow.ratio}:1). The brand colour is kept as is.`,
      };
    }
  }
  return result;
}

/** Role a token belongs to (mirrors follow their source token's role). */
export const roleOf = (token: string): RoleId | undefined => TOKEN_RULES[token]?.role;

function isDetectedManual<S extends RoleState>(state: S, mode: Mode, token: string): boolean {
  const prev = state.brandRoles?.auto[mode]?.[token];
  if (!prev) return false;
  if (state.styles[mode]?.[token] === prev.value) return false;
  // value moved because the palette step it points at was edited → still Auto
  return !(prev.ref && getActiveRef(state, mode, token) === prev.ref);
}

/**
 * Re-resolve every Auto token from the current role assignments. Returns the same object when nothing
 * changes (safe to call after every state change).
 */
export function syncRoles<S extends RoleState>(state: S): S {
  const roles = state.brandRoles;
  if (!roles) return state;

  const palettes = state.brandPalettes ?? [];
  const styles = { light: { ...state.styles.light }, dark: { ...state.styles.dark } };
  const refsIn = state.brandRefs ?? { light: {}, dark: {} };
  const refs: BrandRefs = { light: { ...refsIn.light }, dark: { ...refsIn.dark } };
  const auto: BrandRoles["auto"] = { light: {}, dark: {} };
  const manual: BrandRoles["manual"] = { light: [], dark: [] };

  for (const mode of MODES) {
    for (const [token, rule] of Object.entries(TOKEN_RULES)) {
      const palette = palettes.find((p) => p.id === roles.assignments[rule.role]);
      if (!palette) continue; // unassigned role: token stays exactly as it is

      if (roles.manual[mode]?.includes(token) || isDetectedManual(state, mode, token)) {
        manual[mode].push(token);
        continue;
      }

      const entry = resolveRule(rule[mode], {
        palette,
        roleLabel: ROLE_LABELS[rule.role],
        styles: styles[mode],
        refs: refs[mode],
        mode,
        whiteBackground: !!roles.whiteBackground,
      });
      styles[mode][token] = entry.value;
      if (entry.ref) refs[mode][token] = entry.ref;
      else delete refs[mode][token];
      auto[mode][token] = entry;
    }
  }

  // Drop assignments to palettes that no longer exist.
  const assignments = Object.fromEntries(
    Object.entries(roles.assignments).filter(([, id]) => palettes.some((p) => p.id === id))
  );

  const nextRoles: BrandRoles = { ...roles, assignments, auto, manual };
  const changed =
    JSON.stringify([styles, refs, nextRoles]) !==
    JSON.stringify([state.styles, refsIn, roles]);
  if (!changed) return state;
  return { ...state, styles: styles as S["styles"], brandRefs: refs, brandRoles: nextRoles };
}

const withRoles = <S extends RoleState>(state: S, update: (r: BrandRoles) => BrandRoles): S =>
  syncRoles({ ...state, brandRoles: update(state.brandRoles ?? emptyRoles()) });

/** Assign a palette to a role (or `null` to unassign; its tokens keep their current colours). */
export function assignRole<S extends RoleState>(state: S, role: RoleId, paletteId: string | null): S {
  return withRoles(state, (r) => {
    const assignments = { ...r.assignments };
    if (paletteId) assignments[role] = paletteId;
    else delete assignments[role];
    return { ...r, assignments };
  });
}

export function setWhiteBackground<S extends RoleState>(state: S, white: boolean): S {
  return withRoles(state, (r) => ({ ...r, whiteBackground: white }));
}

/** Return one token (in one mode) to its rule. */
export function resetTokenToAuto<S extends RoleState>(state: S, mode: Mode, token: string): S {
  return withRoles(state, (r) => ({
    ...r,
    manual: { ...r.manual, [mode]: r.manual[mode].filter((t) => t !== token) },
    // forget the old auto value so the current value isn't detected as a manual change again
    auto: { ...r.auto, [mode]: Object.fromEntries(Object.entries(r.auto[mode]).filter(([t]) => t !== token)) },
  }));
}

export function resetAllToAuto<S extends RoleState>(state: S): S {
  return withRoles(state, (r) => ({ ...r, manual: { light: [], dark: [] }, auto: { light: {}, dark: {} } }));
}

export type TokenRoleStatus =
  | { kind: "auto"; label: string; warning?: string }
  | { kind: "manual"; role: RoleId }
  | null;

/** For the UI: is this token following a role rule, overridden, or not role-driven at all? */
export function getTokenRoleStatus<S extends RoleState>(state: S, mode: Mode, token: string): TokenRoleStatus {
  const roles = state.brandRoles;
  const role = roleOf(token);
  if (!roles || !role || !roles.assignments[role]) return null;
  if (roles.manual[mode]?.includes(token) || isDetectedManual(state, mode, token)) return { kind: "manual", role };
  const entry = roles.auto[mode]?.[token];
  return entry ? { kind: "auto", label: entry.label, warning: entry.warning } : null;
}
