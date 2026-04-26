import type { Draft } from "immer";

export type DraftStateRecipe<T> = (draft: Draft<T>) => void;
export type DraftStateAction<T> = T | DraftStateRecipe<T>;
export type DraftStateSetter<T> = (nextState: DraftStateAction<T>) => void;
