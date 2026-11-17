"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { exportDashboard, type DashboardParams } from "@/services/reports";

type DashboardExportProps = {
  range: DashboardParams;
  disabled: boolean;
};

export function DashboardExport({ range, disabled }: DashboardExportProps) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(false);
    try {
      const blob = await exportDashboard(range);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      try {
        link.href = url;
        link.download = `indicadores-${range.from}_${range.to}.csv`;
        document.body.append(link);
        link.click();
      } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-full shrink-0 flex-col gap-2">
      <Button
        variant="secondary"
        disabled={disabled}
        loading={busy}
        onClick={() => void download()}
      >
        {!busy && <Icon name="download" className="size-5" />}
        Descargar CSV
      </Button>
      {error && (
        <p role="alert" className="max-w-64 text-sm text-danger">
          No pudimos descargar el CSV. Intenta de nuevo.
        </p>
      )}
    </div>
  );
}
