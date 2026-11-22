"use client";

import { useCallback, useSyncExternalStore } from "react";

export const TOUCH_PRIMARY_QUERY = "(hover: none) and (pointer: coarse)";
const serverSnapshot = () => false;

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    serverSnapshot,
  );
}
