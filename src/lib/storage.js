const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function setCookie(name, value, maxAge = COOKIE_MAX_AGE) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
}

export function getCookie(name) {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ""
  );
}

export function loadJsonCookie(name) {
  try {
    const raw = getCookie(name);
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    return null;
  }
}

export function loadStoredJson(name, preferLocalStorage = true) {
  if (preferLocalStorage) {
    try {
      const local = localStorage.getItem(name);
      if (local) {
        return JSON.parse(local);
      }
    } catch {
      // Fall back to cookies.
    }
  }

  return loadJsonCookie(name);
}

export function saveJson(name, value, options = {}) {
  const serialized = JSON.stringify(value);
  setCookie(name, serialized);

  if (options.localStorage !== false) {
    try {
      localStorage.setItem(name, serialized);
    } catch {
      // Best effort.
    }
  }
}

export function loadStateObject(name, fallbackValue, options = {}) {
  const createFallback =
    typeof fallbackValue === "function"
      ? fallbackValue
      : () => structuredClone(fallbackValue);

  try {
    const raw = options.preferLocalStorage
      ? localStorage.getItem(name) || getCookie(name)
      : getCookie(name);

    if (!raw) {
      return createFallback();
    }

    const parsed =
      raw.trim().startsWith("{") || raw.trim().startsWith("[")
        ? JSON.parse(raw)
        : JSON.parse(decodeURIComponent(raw));

    return options.normalize
      ? options.normalize(parsed, createFallback())
      : parsed;
  } catch {
    return createFallback();
  }
}

export function saveStateObject(name, value, options = {}) {
  const serialized = JSON.stringify(value);
  setCookie(name, serialized);

  if (options.localStorage) {
    try {
      localStorage.setItem(name, serialized);
    } catch {
      // Best effort.
    }
  }
}
