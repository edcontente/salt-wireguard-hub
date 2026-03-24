import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import {
  addProposalItem,
  addSection,
  createDraftProposal,
  createRevisionFromCurrentVersion,
  markProposalAsApproved,
  markProposalAsLost,
  sendProposalVersion
} from "./proposal.service";

const TEST_PROPOSAL_PREFIX = "TEST-PROP";

async function ensureProposalActor() {
  const profile = await db.commercialProfile.upsert({
    where: { slug: "proposal_manager_test" },
    update: {
      name: "Proposal Manager Test",
      canManageCatalog: true,
      canManageProposals: true,
      maxFinalPriceAdjustment: 10
    },
    create: {
      slug: "proposal_manager_test",
      name: "Proposal Manager Test",
      canManageCatalog: true,
      canManageProposals: true,
      maxFinalPriceAdjustment: 10
    }
  });

  return db.user.upsert({
    where: { email: "proposal-test@commercial.local" },
    update: {
      name: "Proposal Test User",
      passwordHash: "proposal-test-password-hash",
      profileId: profile.id
    },
    create: {
      name: "Proposal Test User",
      email: "proposal-test@commercial.local",
      passwordHash: "proposal-test-password-hash",
      profileId: profile.id
    }
  });
}

async function ensureCatalogItem(actorId: string) {
  return db.commercialItem.upsert({
    where: { code: `${TEST_PROPOSAL_PREFIX}-ITEM` },
    update: {
      name: "Amplificador multicanal",
      category: "Audio",
      subcategory: "Amplificadores",
      type: "PRODUCT",
      unit: "UN",
      baseCost: 3000,
      referencePrice: 5000,
      commercialDescription: "Amplificador principal",
      manufacturer: "Denon",
      model: "X3800H",
      sku: `${TEST_PROPOSAL_PREFIX}-SKU`,
      updatedById: actorId
    },
    create: {
      code: `${TEST_PROPOSAL_PREFIX}-ITEM`,
      name: "Amplificador multicanal",
      category: "Audio",
      subcategory: "Amplificadores",
      type: "PRODUCT",
      unit: "UN",
      baseCost: 3000,
      referencePrice: 5000,
      commercialDescription: "Amplificador principal",
      manufacturer: "Denon",
      model: "X3800H",
      sku: `${TEST_PROPOSAL_PREFIX}-SKU`,
      createdById: actorId,
      updatedById: actorId
    }
  });
}

beforeEach(async () => {
  await db.proposal.deleteMany({
    where: {
      number: {
        startsWith: TEST_PROPOSAL_PREFIX
      }
    }
  });

  await db.commercialItem.deleteMany({
    where: {
      code: `${TEST_PROPOSAL_PREFIX}-ITEM`
    }
  });
});

describe("proposal service", () => {
  it("opens a proposal in draft", async () => {
    const actor = await ensureProposalActor();
    const proposal = await createDraftProposal(
      {
        number: `${TEST_PROPOSAL_PREFIX}-001`,
        title: "Home Theater Contente",
        customerName: "Cliente Teste",
        customerEmail: "cliente@teste.local"
      },
      actor.id
    );

    expect(proposal.status).toBe("DRAFT");
    expect(proposal.currentRevision).toBe(0);

    const version = await db.proposalVersion.findFirst({
      where: { proposalId: proposal.id }
    });

    expect(version?.label).toBe(`${TEST_PROPOSAL_PREFIX}-001`);
    expect(version?.status).toBe("DRAFT");
  });

  it("blocks price adjustment above the profile limit", async () => {
    const actor = await ensureProposalActor();
    const catalogItem = await ensureCatalogItem(actor.id);
    const proposal = await createDraftProposal(
      {
        number: `${TEST_PROPOSAL_PREFIX}-002`,
        title: "Cinema",
        customerName: "Cliente Teste"
      },
      actor.id
    );
    const version = await db.proposalVersion.findFirstOrThrow({
      where: { proposalId: proposal.id }
    });
    const section = await addSection(version.id, { title: "Sala" }, actor.id);

    await expect(
      addProposalItem(
        section.id,
        {
          commercialItemId: catalogItem.id,
          quantity: 1,
          unitPrice: 4000,
          discountPercent: 0
        },
        {
          actorUserId: actor.id,
          maxFinalPriceAdjustment: 10
        }
      )
    ).rejects.toThrow("alçada");
  });

  it("freezes the sent version, creates REV1 and records audit", async () => {
    const actor = await ensureProposalActor();
    const catalogItem = await ensureCatalogItem(actor.id);
    const proposal = await createDraftProposal(
      {
        number: `${TEST_PROPOSAL_PREFIX}-003`,
        title: "Projeto AV",
        customerName: "Cliente Teste"
      },
      actor.id
    );
    const version = await db.proposalVersion.findFirstOrThrow({
      where: { proposalId: proposal.id }
    });
    const section = await addSection(version.id, { title: "Sala" }, actor.id);

    await addProposalItem(
      section.id,
      {
        commercialItemId: catalogItem.id,
        quantity: 1,
        unitPrice: 5000,
        discountPercent: 0
      },
      {
        actorUserId: actor.id,
        maxFinalPriceAdjustment: 10
      }
    );

    const sentVersion = await sendProposalVersion(proposal.id, actor.id);
    const sentProposal = await db.proposal.findUniqueOrThrow({
      where: { id: proposal.id }
    });

    expect(sentVersion.status).toBe("LOCKED");
    expect(sentProposal.status).toBe("SENT");

    const revision = await createRevisionFromCurrentVersion(proposal.id, actor.id);

    expect(revision.label).toBe(`${TEST_PROPOSAL_PREFIX}-003-REV1`);

    const auditEvents = await db.proposalAuditLog.findMany({
      where: { proposalId: proposal.id },
      orderBy: { createdAt: "asc" }
    });

    expect(auditEvents.some((event) => event.action === "VERSION_SENT")).toBe(true);
    expect(auditEvents.some((event) => event.action === "REVISION_CREATED")).toBe(true);
  });

  it("marks the proposal as approved or lost", async () => {
    const actor = await ensureProposalActor();
    const approved = await createDraftProposal(
      {
        number: `${TEST_PROPOSAL_PREFIX}-004`,
        title: "Projeto Aprovado",
        customerName: "Cliente Teste"
      },
      actor.id
    );
    const lost = await createDraftProposal(
      {
        number: `${TEST_PROPOSAL_PREFIX}-005`,
        title: "Projeto Perdido",
        customerName: "Cliente Teste"
      },
      actor.id
    );

    await sendProposalVersion(approved.id, actor.id);
    await sendProposalVersion(lost.id, actor.id);

    const approvedProposal = await markProposalAsApproved(approved.id, actor.id);
    const lostProposal = await markProposalAsLost(lost.id, actor.id);

    expect(approvedProposal.status).toBe("APPROVED");
    expect(lostProposal.status).toBe("LOST");
  });

  it("blocks approval, loss, and revision when lifecycle transitions are invalid", async () => {
    const actor = await ensureProposalActor();
    const draft = await createDraftProposal(
      {
        number: `${TEST_PROPOSAL_PREFIX}-006`,
        title: "Projeto em rascunho",
        customerName: "Cliente Teste"
      },
      actor.id
    );

    await expect(markProposalAsApproved(draft.id, actor.id)).rejects.toThrow("enviada");
    await expect(markProposalAsLost(draft.id, actor.id)).rejects.toThrow("enviada");

    await expect(
      createRevisionFromCurrentVersion(draft.id, actor.id)
    ).rejects.toThrow("enviada");

    await sendProposalVersion(draft.id, actor.id);
    await markProposalAsApproved(draft.id, actor.id);

    await expect(
      createRevisionFromCurrentVersion(draft.id, actor.id)
    ).rejects.toThrow("finalizada");
  });
});
