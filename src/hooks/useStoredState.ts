import { useCallback, useEffect, useState } from "react";
import { produce, type Draft } from "immer";
import { loadStoredJson, saveJson, STORAGE_DOCUMENT_EVENT } from "../lib/storage";

type NormalizeStoredValue<T> = (value: unknown, fallback: T) => T;
type UseStoredStateOptions<T> = {
  normalize?: NormalizeStoredValue<T>;
};
export type StoredStateRecipe<T> = (draft: Draft<T>) => void;
export type StoredStateAction<T> = T | StoredStateRecipe<T>;
export type StoredStateSetter<T> = (nextState: StoredStateAction<T>) => void;

export function useStoredState<T>(key: string, fallbackValue: T | (() => T), options: UseStoredStateOptions<T> = {}) {
  const normalize = options.normalize;
  const readState = useCallback(() => {
    const fallback =
      typeof fallbackValue === "function" ? (fallbackValue as () => T)() : structuredClone(fallbackValue);
    const value = loadStoredJson(key);
    return value === null ? fallback : normalize ? normalize(value, fallback) : (value as T);
  }, [fallbackValue, key, normalize]);

  const [state, setReactState] = useState(readState);

  const setState = useCallback<StoredStateSetter<T>>((nextState) => {
    setReactState((current) =>
      typeof nextState === "function" ? produce(current, nextState as StoredStateRecipe<T>) : nextState,
    );
  }, []);

  useEffect(() => {
    saveJson(key, state);
  }, [key, state]);

  useEffect(() => {
    function handleStorageDocumentChange() {
      setReactState(readState());
    }

    window.addEventListener(STORAGE_DOCUMENT_EVENT, handleStorageDocumentChange);
    return () => window.removeEventListener(STORAGE_DOCUMENT_EVENT, handleStorageDocumentChange);
  }, [readState]);

  return [state, setState] as const;
}
