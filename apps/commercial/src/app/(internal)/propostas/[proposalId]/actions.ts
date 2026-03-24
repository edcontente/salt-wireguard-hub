"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCommercialSession } from "@/lib/auth/session";
import {
  addProposalItem,
  addSection,
  createRevisionFromCurrentVersion,
  markProposalAsApproved,
  markProposalAsLost,
  sendProposalVersion
} from "@/lib/proposals/proposal.service";
import { ensureProposalPublicLinkForProposal } from "@/lib/proposals/proposal-presenter";

function readOptionalField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function redirectToProposal(proposalId: string, errorMessage?: string) {
  if (errorMessage) {
    redirect(`/propostas/${proposalId}?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect(`/propostas/${proposalId}`);
}

async function requireProposalManager() {
  const user = await requireCommercialSession();

  if (!user.canManageProposals) {
    throw new Error("Usuario sem permissao para gerenciar propostas.");
  }

  return user;
}

export async function addProposalSectionAction(
  proposalId: string,
  proposalVersionId: string,
  formData: FormData
) {
  const user = await requireProposalManager();
  const title = formData.get("title");
  const description = readOptionalField(formData, "description");

  if (typeof title !== "string") {
    throw new Error("Formulario invalido.");
  }

  try {
    await addSection(
      proposalVersionId,
      {
        title,
        description
      },
      user.id
    );
  } catch (error) {
    redirectToProposal(
      proposalId,
      error instanceof Error ? error.message : "Nao foi possivel adicionar o ambiente."
    );
  }

  revalidatePath(`/propostas/${proposalId}`);
  redirectToProposal(proposalId);
}

export async function addProposalItemAction(
  proposalId: string,
  formData: FormData
) {
  const user = await requireProposalManager();
  const sectionId = formData.get("sectionId");
  const quantity = formData.get("quantity");

  if (typeof sectionId !== "string" || typeof quantity !== "string") {
    throw new Error("Formulario invalido.");
  }

  try {
    await addProposalItem(
      sectionId,
      {
        commercialItemId: readOptionalField(formData, "commercialItemId"),
        description: readOptionalField(formData, "description"),
        quantity: Number(quantity),
        unitPrice: readOptionalField(formData, "unitPrice")
          ? Number(readOptionalField(formData, "unitPrice"))
          : undefined
      },
      {
        actorUserId: user.id,
        maxFinalPriceAdjustment: user.maxFinalPriceAdjustment
      }
    );
  } catch (error) {
    redirectToProposal(
      proposalId,
      error instanceof Error ? error.message : "Nao foi possivel adicionar o item."
    );
  }

  revalidatePath(`/propostas/${proposalId}`);
  redirectToProposal(proposalId);
}

export async function sendProposalVersionAction(proposalId: string) {
  const user = await requireProposalManager();

  try {
    await sendProposalVersion(proposalId, user.id);
    await ensureProposalPublicLinkForProposal(proposalId);
  } catch (error) {
    redirectToProposal(
      proposalId,
      error instanceof Error ? error.message : "Nao foi possivel enviar a versao."
    );
  }

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
  redirectToProposal(proposalId);
}

export async function createProposalRevisionAction(proposalId: string) {
  const user = await requireProposalManager();

  try {
    await createRevisionFromCurrentVersion(proposalId, user.id);
  } catch (error) {
    redirectToProposal(
      proposalId,
      error instanceof Error ? error.message : "Nao foi possivel criar a revisao."
    );
  }

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
  redirectToProposal(proposalId);
}

export async function approveProposalAction(proposalId: string) {
  const user = await requireProposalManager();

  await markProposalAsApproved(proposalId, user.id);

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
  redirect(`/propostas/${proposalId}?purchasePrompt=1`);
}

export async function loseProposalAction(proposalId: string) {
  const user = await requireProposalManager();

  await markProposalAsLost(proposalId, user.id);

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
  redirectToProposal(proposalId);
}

export type ProposalEditorAction = (formData: FormData) => Promise<void>;
