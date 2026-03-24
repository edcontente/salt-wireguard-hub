import { buildRevisionLabel } from "./proposal-numbering";

type VersionSectionSnapshot = {
  id: string;
  title: string;
  subtotal: number;
};

type SentVersionSnapshotInput = {
  proposalId: string;
  proposalNumber: string;
  versionId: string;
  label: string;
  revisionNumber: number;
  sections: VersionSectionSnapshot[];
  total: number;
};

type RevisionDraftSource = {
  id: string;
  label: string;
  revisionNumber: number;
  sections: Array<{
    id: string;
    title: string;
    description?: string | null;
    position: number;
    items: Array<{
      id: string;
      commercialItemId?: string | null;
      name: string;
      description?: string | null;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      position: number;
    }>;
  }>;
};

export function buildSentVersionSnapshot(input: SentVersionSnapshotInput) {
  return {
    proposalId: input.proposalId,
    versionId: input.versionId,
    label: input.label,
    revisionNumber: input.revisionNumber,
    status: "LOCKED" as const,
    snapshotTotals: {
      proposalNumber: input.proposalNumber,
      sections: input.sections,
      total: input.total
    }
  };
}

export function createRevisionDraftFromVersion(input: {
  proposalNumber: string;
  currentRevision: number;
  sourceVersion: RevisionDraftSource;
}) {
  const nextRevision = input.currentRevision + 1;

  return {
    revisionNumber: nextRevision,
    label: buildRevisionLabel(input.proposalNumber, nextRevision),
    sections: input.sourceVersion.sections.map((section) => ({
      title: section.title,
      description: section.description ?? null,
      position: section.position,
      items: section.items.map((item) => ({
        commercialItemId: item.commercialItemId ?? null,
        name: item.name,
        description: item.description ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        position: item.position
      }))
    }))
  };
}
