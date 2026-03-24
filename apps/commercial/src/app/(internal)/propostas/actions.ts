"use server";

import { redirect } from "next/navigation";
import { requireCommercialSession } from "@/lib/auth/session";
import {
  buildNextProposalNumber,
  createDraftProposal
} from "@/lib/proposals/proposal.service";

export async function createProposalAction(formData: FormData) {
  const user = await requireCommercialSession();

  if (!user.canManageProposals) {
    throw new Error("Usuario sem permissao para gerenciar propostas.");
  }

  const title = formData.get("title");
  const customerName = formData.get("customerName");
  const customerEmail = formData.get("customerEmail");

  if (
    typeof title !== "string" ||
    typeof customerName !== "string" ||
    (customerEmail !== null && typeof customerEmail !== "string")
  ) {
    throw new Error("Formulario invalido.");
  }

  const proposal = await createDraftProposal(
    {
      number: await buildNextProposalNumber(),
      title,
      customerName,
      customerEmail: customerEmail?.trim() ? customerEmail : undefined
    },
    user.id
  );

  redirect(`/propostas/${proposal.id}`);
}
