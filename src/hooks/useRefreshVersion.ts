import { useEffect, useState } from "react";

export function useRefreshVersion() {
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    function handleStorage() {
      setRefreshVersion((current) => current + 1);
    }

    function handleVisibility() {
      if (!document.hidden) {
        setRefreshVersion((current) => current + 1);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("pageshow", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pageshow", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return refreshVersion;
}
