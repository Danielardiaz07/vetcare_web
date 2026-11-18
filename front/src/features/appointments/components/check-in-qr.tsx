"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrivalQrDialog } from "@/features/appointments/components/arrival-qr-dialog";
import type { Appointment } from "@/types/domain";

export function CheckInQr({ appointment }: { appointment: Appointment }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Mostrar QR de llegada
      </Button>
      {open && <ArrivalQrDialog appointment={appointment} onClose={() => setOpen(false)} />}
    </>
  );
}
