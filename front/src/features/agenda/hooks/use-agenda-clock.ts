"use client";

import { useEffect, useState } from "react";

const CLOCK_TICK_MS = 10 * 1000;

export function useAgendaClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: number;
    function sync() {
      window.clearTimeout(timer);
      setNow(new Date());
      timer = window.setTimeout(sync, CLOCK_TICK_MS - (Date.now() % CLOCK_TICK_MS));
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") sync();
    }
    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return now;
}
