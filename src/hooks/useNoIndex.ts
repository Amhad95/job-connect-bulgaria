import { useEffect } from "react";

/**
 * Injects a <meta name="robots" content="noindex, nofollow"> tag
 * into <head> while mounted. Removes it on unmount.
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);
}
