import React from "react";
import type { Draft } from "immer";
import type { DraftStateRecipe, DraftStateSetter } from "../lib/state";

export function useDraftFieldSetter<T, K extends keyof T>(
  setState: DraftStateSetter<T>,
  key: K,
): DraftStateSetter<T[K]> {
  return React.useCallback(
    (nextState) => {
      setState((draft) => {
        const fields = draft as Record<K, T[K]>;
        if (typeof nextState === "function") {
          (nextState as DraftStateRecipe<T[K]>)(fields[key] as Draft<T[K]>);
        } else {
          fields[key] = nextState;
        }
      });
    },
    [key, setState],
  );
}
