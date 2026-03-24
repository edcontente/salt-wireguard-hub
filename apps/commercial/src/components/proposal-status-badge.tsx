import React from "react";
import type { ProposalStatus } from "@/lib/proposals/proposal.schemas";

const statusLabelMap: Record<ProposalStatus, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  LOST: "Perdida",
  ARCHIVED: "Arquivada"
};

type ProposalStatusBadgeProps = {
  status: ProposalStatus;
};

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  return <span>{statusLabelMap[status]}</span>;
}
