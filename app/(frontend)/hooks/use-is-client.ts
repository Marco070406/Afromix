"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** false au rendu serveur et à l'hydratation, true ensuite (ex. avant un createPortal). */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
