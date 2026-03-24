import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import {
  addProposalItem,
  addSection,
  createDraftProposal,
  sendProposalVersion
} from "./proposal.service";
import {
  ensureProposalPublicLinkForProposal,
  getProposalPresentationByPublicShare,
  getProposalPresentationForPdf
} from "./proposal-presenter";

const TEST_PRESENTATION_PREFIX = "TEST-PRES";

async function ensurePresenterActor() {
  const profile = await db.commercialProfile.upsert({
    where: { slug: "proposal_presenter_test" },
    update: {
      name: "Proposal Presenter Test",
      canManageCatalog: true,
      canManageProposals: true,
      maxFinalPriceAdjustment: 10
    },
    create: {
      slug: "proposal_presenter_test",
      name: "Proposal Presenter Test",
      canManageCatalog: true,
      canManageProposals: true,
      maxFinalPriceAdjustment: 10
    }
  });

  return db.user.upsert({
    where: { email: "proposal-presenter@commercial.local" },
    update: {
      name: "Proposal Presenter User",
      passwordHash: "proposal-presenter-password-hash",
      profileId: profile.id
    },
    create: {
      name: "Proposal Presenter User",
      email: "proposal-presenter@commercial.local",
      passwordHash: "proposal-presenter-password-hash",
      profileId: profile.id
    }
  });
}

async function ensurePresenterCatalogItem(actorId: string) {
  return db.commercialItem.upsert({
    where: { code: `${TEST_PRESENTATION_PREFIX}-ITEM` },
    update: {
      name: "Projetor teste",
      category: "Video",
      subcategory: "Projetores",
      type: "PRODUCT",
      unit: "UN",
      baseCost: 1000,
      referencePrice: 2000,
      commercialDescription: "Projetor comercial",
      imageUrl: "https://example.com/projetor-teste.jpg",
      updatedById: actorId
    },
    create: {
      code: `${TEST_PRESENTATION_PREFIX}-ITEM`,
      name: "Projetor teste",
      category: "Video",
      subcategory: "Projetores",
      type: "PRODUCT",
      unit: "UN",
      baseCost: 1000,
      referencePrice: 2000,
      commercialDescription: "Projetor comercial",
      imageUrl: "https://example.com/projetor-teste.jpg",
      createdById: actorId,
      updatedById: actorId
    }
  });
}

beforeEach(async () => {
  await db.proposal.deleteMany({
    where: {
      number: {
        startsWith: TEST_PRESENTATION_PREFIX
      }
    }
  });

  await db.commercialItem.deleteMany({
    where: {
      code: `${TEST_PRESENTATION_PREFIX}-ITEM`
    }
  });
});

describe("proposal presenter", () => {
  it("requires an active public token to resolve shared presentation and pdf", async () => {
    const actor = await ensurePresenterActor();
    const catalogItem = await ensurePresenterCatalogItem(actor.id);
    const proposal = await createDraftProposal(
      {
        number: `${TEST_PRESENTATION_PREFIX}-001`,
        title: "Apresentacao publica",
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
        unitPrice: 2000
      },
      {
        actorUserId: actor.id,
        maxFinalPriceAdjustment: 10
      }
    );

    await sendProposalVersion(proposal.id, actor.id);
    const publicLink = await ensureProposalPublicLinkForProposal(proposal.id);

    const sharedProposal = await getProposalPresentationByPublicShare(publicLink.token);
    const pdfProposal = await getProposalPresentationForPdf(
      proposal.id,
      publicLink.token
    );

    expect(sharedProposal.versionLabel).toBe(`${TEST_PRESENTATION_PREFIX}-001`);
    expect(pdfProposal.versionLabel).toBe(`${TEST_PRESENTATION_PREFIX}-001`);

    await expect(
      getProposalPresentationForPdf(proposal.id, "token-invalido")
    ).rejects.toThrow("Link publico invalido");
  });
});
