import { useCallback, useEffect, useState } from "react";
import { produce, type Draft } from "immer";
import { loadStoredJson, saveJson } from "../lib/storage";

type NormalizeStoredValue<T> = (value: unknown, fallback: T) => T;
type UseStoredStateOptions<T> = {
  normalize?: NormalizeStoredValue<T>;
};
export type StoredStateRecipe<T> = (draft: Draft<T>) => void;
export type StoredStateAction<T> = T | StoredStateRecipe<T>;
export type StoredStateSetter<T> = (nextState: StoredStateAction<T>) => void;

export function useStoredState<T>(
  key: string,
  fallbackValue: T | (() => T),
  options: UseStoredStateOptions<T> = {},
) {
  const [state, setReactState] = useState(() => {
    const fallback = typeof fallbackValue === "function" ? (fallbackValue as () => T)() : structuredClone(fallbackValue);
    const value = loadStoredJson(key);
    return value === null ? fallback : options.normalize ? options.normalize(value, fallback) : (value as T);
  });

  const setState = useCallback<StoredStateSetter<T>>((nextState) => {
    setReactState((current) =>
      typeof nextState === "function" ? produce(current, nextState as StoredStateRecipe<T>) : nextState,
    );
  }, []);

  useEffect(() => {
    saveJson(key, state);
  }, [key, state]);

  return [state, setState] as const;
}
