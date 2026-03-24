import { randomBytes } from "node:crypto";
import { db } from "../db";
import type { ProposalPresentationViewModel } from "./proposal-editor.types";

function buildTypeLabel(type?: string | null) {
  if (type === "PRODUCT") {
    return "Produto";
  }

  if (type === "SERVICE") {
    return "Servico";
  }

  return "Item";
}

function computeItemTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number
) {
  return quantity * unitPrice * (1 - discountPercent / 100);
}

function buildProposalIntro(title: string, customerName: string) {
  return `Proposta comercial ${title} preparada para ${customerName}.`;
}

function activeLinkWhereClause(currentDate = new Date()) {
  return {
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: currentDate } }]
  };
}

async function getLockedVersionByProposalId(proposalId: string) {
  return db.proposalVersion.findFirst({
    where: {
      proposalId,
      status: "LOCKED"
    },
    orderBy: {
      revisionNumber: "desc"
    },
    include: {
      proposal: true,
      publicLinks: {
        where: activeLinkWhereClause(),
        orderBy: {
          createdAt: "desc"
        }
      },
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
}

async function getActivePublicLinkByToken(token: string) {
  const publicLink = await db.proposalPublicLink.findUnique({
    where: { token },
    include: {
      proposalVersion: {
        include: {
          proposal: true,
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
      }
    }
  });

  if (
    !publicLink ||
    publicLink.revokedAt ||
    (publicLink.expiresAt && publicLink.expiresAt <= new Date())
  ) {
    throw new Error("Link publico invalido ou expirado.");
  }

  if (publicLink.proposalVersion.status !== "LOCKED") {
    throw new Error("Versao enviada nao encontrada.");
  }

  return publicLink;
}

type ProposalPresentationVersion = {
  label: string;
  proposal: {
    number: string;
    title: string;
    customerName: string;
  };
  sections: Array<{
    id: string;
    title: string;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      commercialItem: {
        type: string;
        imageUrl: string | null;
      } | null;
    }>;
  }>;
};

export function presentProposalVersion(version: ProposalPresentationVersion | null) {
  if (!version) {
    throw new Error("Versao enviada nao encontrada.");
  }

  const sections = version.sections.map((section) => {
    const items = section.items.map((item) => {
      const totalPrice = computeItemTotal(
        item.quantity,
        item.unitPrice,
        item.discountPercent
      );

      return {
        id: item.id,
        typeLabel: buildTypeLabel(item.commercialItem?.type),
        name: item.name,
        description: item.description,
        imageUrl: item.commercialItem?.imageUrl ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice
      };
    });

    return {
      id: section.id,
      title: section.title,
      items,
      totalPrice: items.reduce((sum, item) => sum + item.totalPrice, 0)
    };
  });

  return {
    number: version.proposal.number,
    versionLabel: version.label,
    title: version.proposal.title,
    customerName: version.proposal.customerName,
    intro: buildProposalIntro(
      version.proposal.title,
      version.proposal.customerName
    ),
    sections,
    totalPrice: sections.reduce((sum, section) => sum + section.totalPrice, 0)
  } satisfies ProposalPresentationViewModel;
}

export async function ensureProposalPublicLinkForProposal(proposalId: string) {
  const version = await getLockedVersionByProposalId(proposalId);

  if (!version) {
    throw new Error("Nenhuma versao enviada disponivel para compartilhar.");
  }

  const existingLink = version.publicLinks[0];

  if (existingLink) {
    return existingLink;
  }

  return db.proposalPublicLink.create({
    data: {
      proposalVersionId: version.id,
      token: randomBytes(18).toString("hex")
    }
  });
}

export async function getProposalPresentationByProposalId(
  proposalId: string
): Promise<ProposalPresentationViewModel> {
  const version = await getLockedVersionByProposalId(proposalId);

  return presentProposalVersion(version);
}

export async function getProposalPresentationByPublicShare(
  token: string
): Promise<ProposalPresentationViewModel> {
  const publicLink = await getActivePublicLinkByToken(token);

  await db.proposalPublicLink.update({
    where: { id: publicLink.id },
    data: {
      accessCount: {
        increment: 1
      }
    }
  });

  return presentProposalVersion(publicLink.proposalVersion);
}

export async function getProposalPresentationForPdf(
  proposalId: string,
  token: string
): Promise<ProposalPresentationViewModel> {
  const publicLink = await getActivePublicLinkByToken(token);

  if (publicLink.proposalVersion.proposalId !== proposalId) {
    throw new Error("Link publico invalido ou expirado.");
  }

  return presentProposalVersion(publicLink.proposalVersion);
}

export async function getLatestProposalSharePaths(proposalId: string) {
  const version = await getLockedVersionByProposalId(proposalId);

  if (!version) {
    return {
      publicSharePath: null,
      pdfPath: null
    };
  }

  const publicLink = version.publicLinks[0];

  return {
    publicSharePath: publicLink ? `/p/${publicLink.token}` : null,
    pdfPath: publicLink
      ? `/api/proposals/${proposalId}/pdf?token=${publicLink.token}`
      : null
  };
}
