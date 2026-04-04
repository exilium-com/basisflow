import { useEffect, useRef, useState } from "react";
import { loadStateObject, saveStateObject } from "../lib/storage";

export function useStoredState(key, fallbackValue, options = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [state, setState] = useState(() => loadStateObject(key, fallbackValue, options));

  useEffect(() => {
    saveStateObject(key, state, optionsRef.current);
  }, [key, state]);

  return [state, setState];
}
