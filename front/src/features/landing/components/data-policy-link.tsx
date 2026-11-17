"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/ui/modal";
import { DATA_POLICY_SECTIONS, DATA_POLICY_UPDATED_AT } from "@/features/landing/data-policy";

type DataPolicyLinkProps = {
  children: ReactNode;
  className?: string;
};

// RN-60: la política se abre en una ventana para no sacar a nadie del formulario de registro.
// El portal la saca del <label> del registro y del <p> del pie, donde un <dialog> no es válido.
export function DataPolicyLink({ children, className }: DataPolicyLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && createPortal(<DataPolicyModal onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function DataPolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal open title="Política de tratamiento de datos personales" onClose={onClose}>
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1 text-sm text-muted">
        {DATA_POLICY_SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h3 className="font-semibold text-ink">{section.title}</h3>
            {section.items && (
              <ul className="list-disc space-y-1 pl-5">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        <p className="text-subtle">Última actualización: {DATA_POLICY_UPDATED_AT}.</p>
      </div>
    </Modal>
  );
}
