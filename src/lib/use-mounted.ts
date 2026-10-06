"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true setelah client mount — aman untuk render state dari localStorage (zustand persist) */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
