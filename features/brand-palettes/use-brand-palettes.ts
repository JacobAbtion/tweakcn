"use client";

import { useCallback, useMemo } from "react";
import { useEditorStore } from "@/store/editor-store";
import type { ThemeEditorState } from "@/types/editor";
import * as ops from "./palette";
import type { ScaleStep } from "./scale";
import type { BrandPalette, BrandRef, Mode } from "./types";

const EMPTY: BrandPalette[] = [];

/** Read and change brand palettes in the editor store. Every change goes through `setThemeState`, so it
 * is persisted, undoable, and shows up in the preview like any other theme edit. */
export function useBrandPalettes() {
  const palettes = useEditorStore((s) => s.themeState.brandPalettes) ?? EMPTY;

  const apply = useCallback((fn: (state: ThemeEditorState) => ThemeEditorState) => {
    const { themeState, setThemeState } = useEditorStore.getState();
    const next = fn(themeState);
    if (next !== themeState) setThemeState(next);
  }, []);

  const actions = useMemo(
    () => ({
      add: (name: string, hex: string) => {
        const palette = ops.createPalette(name, hex);
        apply((s) => ops.addPalette(s, palette));
        return palette;
      },
      rename: (id: string, name: string) => apply((s) => ops.renamePalette(s, id, name)),
      setBase: (id: string, hex: string) => apply((s) => ops.setPaletteBase(s, id, hex)),
      setStep: (id: string, step: ScaleStep, colour: string) =>
        apply((s) => ops.setStepValue(s, id, step, colour)),
      resetStep: (id: string, step: ScaleStep) => apply((s) => ops.resetStep(s, id, step)),
      resetAll: (id: string) => apply((s) => ops.resetAllOverrides(s, id)),
      remove: (id: string) => apply((s) => ops.deletePalette(s, id)),
      /** Link tokens (one or more, e.g. a base token and its synced sidebar token) to a step. */
      link: (mode: Mode, tokens: string[], ref: BrandRef) =>
        apply((s) => tokens.reduce((acc, t) => ops.linkToken(acc, mode, t, ref), s)),
      unlink: (mode: Mode, token: string) => apply((s) => ops.unlinkToken(s, mode, token)),
    }),
    [apply]
  );

  return { palettes, ...actions };
}

/**
 * For the Colors tab: the live references of all tokens in the current mode, and a function that links
 * tokens to a ref (returns false when the text isn't a known brand step, so callers can fall back).
 */
export function useBrandTokenLinks() {
  const refs = useEditorStore((s) => {
    const { themeState } = s;
    const mode = themeState.currentMode;
    const live: Record<string, BrandRef> = {};
    for (const token of Object.keys(themeState.brandRefs?.[mode] ?? {})) {
      const ref = ops.getActiveRef(themeState, mode, token);
      if (ref) live[token] = ref;
    }
    return JSON.stringify(live);
  });
  const liveRefs = useMemo(() => JSON.parse(refs) as Record<string, BrandRef>, [refs]);
  const { link } = useBrandPalettes();

  const linkTokens = useCallback(
    (tokens: string[], ref: BrandRef) => {
      const { themeState } = useEditorStore.getState();
      if (ops.resolveRef(themeState.brandPalettes, ref) === undefined) return false;
      link(themeState.currentMode, tokens, ref);
      return true;
    },
    [link]
  );

  return { liveRefs, linkTokens };
}

/** The live brand reference of a token in the current mode, e.g. "forest-green-700". */
export function useActiveBrandRef(token: string | undefined): BrandRef | undefined {
  return useEditorStore((s) =>
    token ? ops.getActiveRef(s.themeState, s.themeState.currentMode, token) : undefined
  );
}
