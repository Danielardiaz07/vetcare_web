"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { AttentionView } from "@/features/clinical/components/attention-view";
import { GroomingAttention } from "@/features/grooming/components/grooming-attention";

type AttentionByRoleProps = {
  appointmentId: string;
  date: string;
};

// El veterinario registra consulta o vacuna; el estilista, el servicio estético (RN-51).
export function AttentionByRole(props: AttentionByRoleProps) {
  const { user } = useAuth();
  if (user?.role === "GROOMER") return <GroomingAttention {...props} />;
  return <AttentionView {...props} />;
}
