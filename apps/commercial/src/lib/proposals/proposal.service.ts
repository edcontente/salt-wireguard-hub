import { canAdjustProposalTotal } from "../auth/permissions";
import { db } from "../db";
import { recordProposalAuditEvent } from "../audit/audit.service";
import { calculateProposalTotals } from "./proposal-totals";
import {
  buildSentVersionSnapshot,
  createRevisionDraftFromVersion
} from "./proposal-versioning";
import {
  type ProposalCatalogOption,
  type ProposalEditorItemType,
  type ProposalEditorViewModel,
  type ProposalSummaryViewModel
} from "./proposal-editor.types";
import { buildProposalNumber } from "./proposal-numbering";
import {
  proposalStatusSchema,
  proposalVersionStatusSchema
} from "./proposal.schemas";
import { getLatestProposalSharePaths } from "./proposal-presenter";

type CreateDraftProposalInput = {
  number: string;
  title: string;
  customerName: string;
  customerEmail?: string;
};

type AddSectionInput = {
  title: string;
  description?: string;
};

type AddProposalItemInput = {
  commercialItemId?: string;
  name?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
};

type AddProposalItemContext = {
  actorUserId: string;
  maxFinalPriceAdjustment: number;
};

async function ensureDraftVersion(versionId: string) {
  const version = await db.proposalVersion.findUnique({
    where: { id: versionId },
    include: {
      proposal: true
    }
  });

  if (!version) {
    throw new Error("Versao da proposta nao encontrada.");
  }

  if (version.status !== "DRAFT") {
    throw new Error("Versao enviada esta congelada para edicao.");
  }

  return version;
}

export async function createDraftProposal(
  input: CreateDraftProposalInput,
  actorUserId: string
) {
  return db.$transaction(async (tx) => {
    const proposal = await tx.proposal.create({
      data: {
        number: input.number,
        title: input.title,
        customerName: input.customerName,
        customerEmail: input.customerEmail ?? null,
        status: "DRAFT",
        currentRevision: 0,
        createdById: actorUserId,
        updatedById: actorUserId
      }
    });

    await tx.proposalVersion.create({
      data: {
        proposalId: proposal.id,
        revisionNumber: 0,
        label: proposal.number,
        status: "DRAFT",
        createdById: actorUserId
      }
    });

    await tx.proposalAuditLog.create({
      data: {
        proposalId: proposal.id,
        userId: actorUserId,
        action: "CREATED",
        message: "Proposta criada em rascunho."
      }
    });

    return proposal;
  });
}

export async function addSection(
  proposalVersionId: string,
  input: AddSectionInput,
  actorUserId: string
) {
  const version = await ensureDraftVersion(proposalVersionId);
  const position = await db.proposalSection.count({
    where: { proposalVersionId }
  });

  const section = await db.proposalSection.create({
    data: {
      proposalVersionId,
      title: input.title,
      description: input.description ?? null,
      position
    }
  });

  await recordProposalAuditEvent({
    proposalId: version.proposal.id,
    proposalVersionId,
    userId: actorUserId,
    action: "SECTION_ADDED",
    message: `Ambiente ${input.title} adicionado.`,
    details: {
      sectionId: section.id
    }
  });

  return section;
}

export async function addProposalItem(
  proposalSectionId: string,
  input: AddProposalItemInput,
  context: AddProposalItemContext
) {
  const section = await db.proposalSection.findUnique({
    where: { id: proposalSectionId },
    include: {
      proposalVersion: {
        include: {
          proposal: true
        }
      }
    }
  });

  if (!section) {
    throw new Error("Secao da proposta nao encontrada.");
  }

  if (section.proposalVersion.status !== "DRAFT") {
    throw new Error("Versao enviada esta congelada para edicao.");
  }

  const commercialItem = input.commercialItemId
    ? await db.commercialItem.findUnique({
        where: { id: input.commercialItemId }
      })
    : null;

  const unitPrice = input.unitPrice ?? commercialItem?.referencePrice ?? 0;
  const referencePrice = commercialItem?.referencePrice ?? unitPrice;
  const requestedAdjustmentPercent =
    referencePrice > 0 ? ((referencePrice - unitPrice) / referencePrice) * 100 : 0;

  if (
    requestedAdjustmentPercent > 0 &&
    !canAdjustProposalTotal(
      { maxFinalPriceAdjustment: context.maxFinalPriceAdjustment },
      requestedAdjustmentPercent
    )
  ) {
    throw new Error("Ajuste de valor acima da alçada permitida.");
  }

  const position = await db.proposalItem.count({
    where: { proposalSectionId }
  });

  const item = await db.proposalItem.create({
    data: {
      proposalSectionId,
      commercialItemId: commercialItem?.id ?? null,
      name: input.name ?? commercialItem?.name ?? "Item comercial",
      description:
        input.description ?? commercialItem?.commercialDescription ?? null,
      quantity: input.quantity,
      unitPrice,
      discountPercent: input.discountPercent ?? 0,
      position
    }
  });

  await recordProposalAuditEvent({
    proposalId: section.proposalVersion.proposal.id,
    proposalVersionId: section.proposalVersion.id,
    userId: context.actorUserId,
    action: "ITEM_ADDED",
    message: `Item ${item.name} adicionado a proposta.`,
    details: {
      itemId: item.id
    }
  });

  return item;
}

export async function sendProposalVersion(proposalId: string, actorUserId: string) {
  return db.$transaction(async (tx) => {
    const proposal = await tx.proposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal) {
      throw new Error("Proposta nao encontrada.");
    }

    const currentVersion = await tx.proposalVersion.findFirst({
      where: {
        proposalId,
        revisionNumber: proposal.currentRevision
      },
      include: {
        sections: {
          include: {
            items: true
          },
          orderBy: {
            position: "asc"
          }
        }
      }
    });

    if (!currentVersion) {
      throw new Error("Versao atual da proposta nao encontrada.");
    }

    if (currentVersion.status !== "DRAFT") {
      throw new Error("Versao atual da proposta ja foi enviada.");
    }

    const totals = calculateProposalTotals(
      currentVersion.sections.map((section) => ({
        id: section.id,
        title: section.title,
        items: section.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent
        }))
      }))
    );

    const snapshot = buildSentVersionSnapshot({
      proposalId,
      proposalNumber: proposal.number,
      versionId: currentVersion.id,
      label: currentVersion.label,
      revisionNumber: currentVersion.revisionNumber,
      sections: totals.sections,
      total: totals.total
    });

    const updatedVersion = await tx.proposalVersion.update({
      where: { id: currentVersion.id },
      data: {
        status: snapshot.status,
        notes: JSON.stringify(snapshot.snapshotTotals)
      }
    });

    await tx.proposal.update({
      where: { id: proposalId },
      data: {
        status: "SENT",
        updatedById: actorUserId
      }
    });

    await tx.proposalAuditLog.create({
      data: {
        proposalId,
        proposalVersionId: currentVersion.id,
        userId: actorUserId,
        action: "VERSION_SENT",
        message: "Versao enviada e congelada.",
        details: JSON.stringify(snapshot.snapshotTotals)
      }
    });

    return updatedVersion;
  });
}

export async function createRevisionFromCurrentVersion(
  proposalId: string,
  actorUserId: string
) {
  return db.$transaction(async (tx) => {
    const proposal = await tx.proposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal) {
      throw new Error("Proposta nao encontrada.");
    }

    if (proposal.status === "APPROVED" || proposal.status === "LOST") {
      throw new Error("A proposta ja foi finalizada e nao pode receber nova revisao.");
    }

    if (proposal.status !== "SENT") {
      throw new Error("A revisao so pode ser criada a partir de uma proposta enviada.");
    }

    const sourceVersion = await tx.proposalVersion.findFirst({
      where: {
        proposalId,
        revisionNumber: proposal.currentRevision
      },
      include: {
        sections: {
          include: {
            items: true
          },
          orderBy: {
            position: "asc"
          }
        }
      }
    });

    if (!sourceVersion) {
      throw new Error("Versao base da revisao nao encontrada.");
    }

    if (sourceVersion.status !== "LOCKED") {
      throw new Error("A revisao so pode ser criada a partir de uma versao enviada.");
    }

    const revisionDraft = createRevisionDraftFromVersion({
      proposalNumber: proposal.number,
      currentRevision: proposal.currentRevision,
      sourceVersion
    });

    const createdRevision = await tx.proposalVersion.create({
      data: {
        proposalId,
        revisionNumber: revisionDraft.revisionNumber,
        label: revisionDraft.label,
        status: "DRAFT",
        createdById: actorUserId,
        sections: {
          create: revisionDraft.sections.map((section) => ({
            title: section.title,
            description: section.description,
            position: section.position,
            items: {
              create: section.items.map((item) => ({
                commercialItemId: item.commercialItemId,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercent: item.discountPercent,
                position: item.position
              }))
            }
          }))
        }
      }
    });

    await tx.proposal.update({
      where: { id: proposalId },
      data: {
        currentRevision: revisionDraft.revisionNumber,
        status: "DRAFT",
        updatedById: actorUserId
      }
    });

    await tx.proposalAuditLog.create({
      data: {
        proposalId,
        proposalVersionId: createdRevision.id,
        userId: actorUserId,
        action: "REVISION_CREATED",
        message: `Nova revisao ${createdRevision.label} criada.`
      }
    });

    return createdRevision;
  });
}

export async function markProposalAsApproved(
  proposalId: string,
  actorUserId: string
) {
  const existingProposal = await db.proposal.findUnique({
    where: { id: proposalId }
  });

  if (!existingProposal) {
    throw new Error("Proposta nao encontrada.");
  }

  if (existingProposal.status !== "SENT") {
    throw new Error("A proposta precisa estar enviada antes de ser aprovada.");
  }

  const proposal = await db.proposal.update({
    where: { id: proposalId },
    data: {
      status: "APPROVED",
      updatedById: actorUserId
    }
  });

  await recordProposalAuditEvent({
    proposalId,
    userId: actorUserId,
    action: "APPROVED",
    message: "Proposta marcada como aprovada."
  });

  return proposal;
}

export async function markProposalAsLost(
  proposalId: string,
  actorUserId: string
) {
  const existingProposal = await db.proposal.findUnique({
    where: { id: proposalId }
  });

  if (!existingProposal) {
    throw new Error("Proposta nao encontrada.");
  }

  if (existingProposal.status !== "SENT") {
    throw new Error("A proposta precisa estar enviada antes de ser marcada como perdida.");
  }

  const proposal = await db.proposal.update({
    where: { id: proposalId },
    data: {
      status: "LOST",
      updatedById: actorUserId
    }
  });

  await recordProposalAuditEvent({
    proposalId,
    userId: actorUserId,
    action: "LOST",
    message: "Proposta marcada como perdida."
  });

  return proposal;
}

export async function buildNextProposalNumber(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const currentYearPrefix = `PROP-${year}-`;
  const currentCount = await db.proposal.count({
    where: {
      number: {
        startsWith: currentYearPrefix
      }
    }
  });

  return buildProposalNumber(year, currentCount + 1);
}

function calculateVersionTotal(
  sections: Array<{
    id: string;
    title: string;
    items: Array<{
      quantity: number;
      unitPrice: number;
      discountPercent: number;
    }>;
  }>
) {
  return calculateProposalTotals(sections).total;
}

function mapItemType(type?: string | null): ProposalEditorItemType {
  if (type === "PRODUCT" || type === "SERVICE") {
    return type;
  }

  return "MANUAL";
}

export async function listProposalSummaries(): Promise<ProposalSummaryViewModel[]> {
  const proposals = await db.proposal.findMany({
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      versions: {
        orderBy: {
          revisionNumber: "desc"
        },
        include: {
          sections: {
            orderBy: {
              position: "asc"
            },
            include: {
              items: {
                orderBy: {
                  position: "asc"
                }
              }
            }
          }
        }
      }
    }
  });

  return proposals.map((proposal) => {
    const currentVersion =
      proposal.versions.find(
        (version) => version.revisionNumber === proposal.currentRevision
      ) ?? proposal.versions[0];

    const total = currentVersion
      ? calculateVersionTotal(
          currentVersion.sections.map((section) => ({
            id: section.id,
            title: section.title,
            items: section.items.map((item) => ({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent
            }))
          }))
        )
      : 0;

    return {
      id: proposal.id,
      number: proposal.number,
      versionLabel: currentVersion?.label ?? proposal.number,
      title: proposal.title,
      customerName: proposal.customerName,
      status: proposalStatusSchema.parse(proposal.status),
      total,
      updatedAt: proposal.updatedAt
    };
  });
}

export async function getProposalEditorData(
  proposalId: string,
  maxFinalPriceAdjustment: number
): Promise<ProposalEditorViewModel> {
  const proposal = await db.proposal.findUnique({
    where: { id: proposalId }
  });

  if (!proposal) {
    throw new Error("Proposta nao encontrada.");
  }

  const currentVersion = await db.proposalVersion.findFirst({
    where: {
      proposalId,
      revisionNumber: proposal.currentRevision
    },
    include: {
      sections: {
        orderBy: {
          position: "asc"
        },
        include: {
          items: {
            orderBy: {
              position: "asc"
            },
            include: {
              commercialItem: true
            }
          }
        }
      }
    }
  });

  if (!currentVersion) {
    throw new Error("Versao atual da proposta nao encontrada.");
  }

  const total = calculateVersionTotal(
    currentVersion.sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: section.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent
      }))
    }))
  );
  const sharePaths = await getLatestProposalSharePaths(proposalId);

  return {
    id: proposal.id,
    number: proposal.number,
    versionLabel: currentVersion.label,
    versionStatus: proposalVersionStatusSchema.parse(currentVersion.status),
    title: proposal.title,
    customerName: proposal.customerName,
    customerEmail: proposal.customerEmail,
    status: proposalStatusSchema.parse(proposal.status),
    total,
    maxFinalPriceAdjustment,
    currentVersionId: currentVersion.id,
    publicSharePath: sharePaths.publicSharePath,
    pdfPath: sharePaths.pdfPath,
    sections: currentVersion.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      items: section.items.map((item) => ({
        id: item.id,
        type: mapItemType(item.commercialItem?.type),
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        referencePrice: item.commercialItem?.referencePrice ?? item.unitPrice
      }))
    }))
  };
}

export async function listProposalCatalogOptions(): Promise<ProposalCatalogOption[]> {
  const items = await db.commercialItem.findMany({
    where: {
      active: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return items
    .filter((item) => item.type === "PRODUCT" || item.type === "SERVICE")
    .map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type as "PRODUCT" | "SERVICE",
      referencePrice: item.referencePrice
    }));
}
