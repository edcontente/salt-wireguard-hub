import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import {
  createCatalogItem,
  searchCatalogItems
} from "./catalog.service";

const TEST_PREFIX = "TEST-CATALOG";

async function ensureCatalogActor() {
  const profile = await db.commercialProfile.upsert({
    where: { slug: "catalog_manager_test" },
    update: {
      name: "Catalog Manager Test",
      canManageCatalog: true,
      canManageProposals: true,
      maxFinalPriceAdjustment: 20
    },
    create: {
      slug: "catalog_manager_test",
      name: "Catalog Manager Test",
      canManageCatalog: true,
      canManageProposals: true,
      maxFinalPriceAdjustment: 20
    }
  });

  return db.user.upsert({
    where: { email: "catalog-test@commercial.local" },
    update: {
      name: "Catalog Test User",
      passwordHash: "catalog-test-password-hash",
      profileId: profile.id
    },
    create: {
      name: "Catalog Test User",
      email: "catalog-test@commercial.local",
      passwordHash: "catalog-test-password-hash",
      profileId: profile.id
    }
  });
}

beforeEach(async () => {
  await db.commercialItem.deleteMany({
    where: {
      code: {
        startsWith: TEST_PREFIX
      }
    }
  });
});

describe("catalog service", () => {
  it("creates a product item", async () => {
    const actor = await ensureCatalogActor();

    const item = await createCatalogItem(
      {
        type: "PRODUCT",
        code: `${TEST_PREFIX}-PRODUCT-1`,
        name: "Caixa Acustica Embutida",
        category: "Audio",
        subcategory: "Embutidos",
        unit: "UN",
        baseCost: 850,
        referencePrice: 1290,
        commercialDescription: "Caixa acustica para sala de estar",
        manufacturer: "Sonance",
        model: "VP66R",
        sku: "SKU-PRODUCT-001",
        ean: "1234567890123",
        imageUrl: "https://example.com/product.jpg"
      },
      actor.id
    );

    expect(item.type).toBe("PRODUCT");
    expect(item.sku).toBe("SKU-PRODUCT-001");
    expect(item.manufacturer).toBe("Sonance");
    expect(item.operationalDescription).toBeNull();
  });

  it("creates a service item", async () => {
    const actor = await ensureCatalogActor();

    const item = await createCatalogItem(
      {
        type: "SERVICE",
        code: `${TEST_PREFIX}-SERVICE-1`,
        name: "Programacao de automacao",
        category: "Servicos",
        subcategory: "Programacao",
        unit: "VB",
        baseCost: 600,
        referencePrice: 1200,
        commercialDescription: "Configuracao completa das cenas de automacao",
        operationalDescription: "Programacao e testes em obra"
      },
      actor.id
    );

    expect(item.type).toBe("SERVICE");
    expect(item.operationalDescription).toBe("Programacao e testes em obra");
    expect(item.sku).toBeNull();
  });

  it("searches catalog items by name or sku", async () => {
    const actor = await ensureCatalogActor();

    await createCatalogItem(
      {
        type: "PRODUCT",
        code: `${TEST_PREFIX}-SEARCH-1`,
        name: "Projetor 4K",
        category: "Video",
        subcategory: "Projetores",
        unit: "UN",
        baseCost: 4500,
        referencePrice: 6900,
        commercialDescription: "Projetor principal do home theater",
        manufacturer: "Epson",
        model: "LS12000",
        sku: "SKU-VIDEO-4K",
        ean: "9999999999999"
      },
      actor.id
    );

    await createCatalogItem(
      {
        type: "SERVICE",
        code: `${TEST_PREFIX}-SEARCH-2`,
        name: "Instalacao Home Theater",
        category: "Servicos",
        subcategory: "Instalacao",
        unit: "VB",
        baseCost: 900,
        referencePrice: 1800,
        commercialDescription: "Instalacao e acabamento do ambiente",
        operationalDescription: "Passagem, fixacao e configuracao"
      },
      actor.id
    );

    const bySku = await searchCatalogItems("SKU-VIDEO");
    const byName = await searchCatalogItems("Home Theater");

    expect(bySku).toHaveLength(1);
    expect(bySku[0]?.name).toBe("Projetor 4K");
    expect(byName).toHaveLength(1);
    expect(byName[0]?.type).toBe("SERVICE");
  });

  it("validates required fields by item type", async () => {
    const actor = await ensureCatalogActor();

    await expect(
      createCatalogItem(
        {
          type: "PRODUCT",
          code: `${TEST_PREFIX}-INVALID-1`,
          name: "Produto incompleto",
          category: "Audio",
          subcategory: "Teste",
          unit: "UN",
          baseCost: 100,
          referencePrice: 150,
          commercialDescription: "Produto sem sku"
        },
        actor.id
      )
    ).rejects.toThrow();

    await expect(
      createCatalogItem(
        {
          type: "SERVICE",
          code: `${TEST_PREFIX}-INVALID-2`,
          name: "Servico incompleto",
          category: "Servicos",
          subcategory: "Teste",
          unit: "VB",
          baseCost: 100,
          referencePrice: 150,
          commercialDescription: "Servico sem descricao operacional"
        },
        actor.id
      )
    ).rejects.toThrow();
  });
});
