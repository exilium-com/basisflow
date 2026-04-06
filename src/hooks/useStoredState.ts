import { useCallback, useEffect, useRef, useState } from "react";
import { produce, type Draft } from "immer";
import { loadStateObject, saveStateObject } from "../lib/storage";

type NormalizeStoredValue<T> = (value: unknown, fallback: T) => T;
type UseStoredStateOptions<T> = {
  normalize?: NormalizeStoredValue<T>;
};
type StoredStateRecipe<T> = (draft: Draft<T>) => void;
type StoredStateAction<T> = T | StoredStateRecipe<T>;

export function useStoredState<T>(
  key: string,
  fallbackValue: T | (() => T),
  options: UseStoredStateOptions<T> = {},
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [state, setReactState] = useState(() => loadStateObject(key, fallbackValue, options));

  const setState = useCallback((nextState: StoredStateAction<T>) => {
    setReactState((current) =>
      typeof nextState === "function" ? produce(current, nextState as StoredStateRecipe<T>) : nextState,
    );
  }, []);

  useEffect(() => {
    saveStateObject(key, state);
  }, [key, state]);

  return [state, setState] as const;
}
