"use client";

import { useEffect, useRef, useState } from "react";
import {
  disableCardVerification,
  getCardVerification,
  rotateCardVerification,
  type CardVerificationLink,
} from "@/services/card-verification";

export function useCardVerification(patientId: string, staff: boolean) {
  const [link, setLink] = useState<CardVerificationLink | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    pending.current = true;
    setBusy(true);
    setError(false);
    setLink(null);
    void getCardVerification(patientId, staff, controller.signal)
      .then((result) => {
        if (generation.current === current) setLink(result);
      })
      .catch(() => {
        if (generation.current === current) setError(true);
      })
      .finally(() => {
        if (generation.current === current) {
          pending.current = false;
          setBusy(false);
        }
      });
    return () => {
      generation.current++;
      controller.abort();
    };
  }, [patientId, staff, revision]);

  async function change(action: "rotate" | "disable") {
    if (staff || pending.current) return;
    const current = generation.current;
    pending.current = true;
    setBusy(true);
    setError(false);
    setLink(null);
    try {
      const result =
        action === "rotate"
          ? await rotateCardVerification(patientId)
          : await disableCardVerification(patientId).then(() => ({ active: false as const }));
      if (generation.current === current) setLink(result);
    } catch {
      if (generation.current === current) setError(true);
    } finally {
      if (generation.current === current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  return { link, busy, error, change, retry: () => setRevision((value) => value + 1) };
}
