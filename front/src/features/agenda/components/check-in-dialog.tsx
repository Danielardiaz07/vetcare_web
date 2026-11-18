"use client";

import { Modal } from "@/components/ui/modal";
import { MobileScannerAccess } from "@/features/agenda/components/mobile-scanner-access";

export function CheckInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Registrar llegada con QR" onClose={onClose}>
      {open && <MobileScannerAccess />}
    </Modal>
  );
}
