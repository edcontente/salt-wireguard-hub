import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await hashPassword("admin123456");

  const adminProfile = await prisma.commercialProfile.upsert({
    where: { slug: "admin_comercial" },
    update: {
      name: "Admin Comercial",
      maxFinalPriceAdjustment: 25,
      canManageCatalog: true,
      canManageProposals: true,
      canManageUsers: true,
      isSystem: true
    },
    create: {
      slug: "admin_comercial",
      name: "Admin Comercial",
      maxFinalPriceAdjustment: 25,
      canManageCatalog: true,
      canManageProposals: true,
      canManageUsers: true,
      isSystem: true
    }
  });

  await prisma.commercialProfile.upsert({
    where: { slug: "vendedor" },
    update: {
      name: "Vendedor",
      maxFinalPriceAdjustment: 10,
      canManageCatalog: false,
      canManageProposals: true,
      canManageUsers: false,
      isSystem: true
    },
    create: {
      slug: "vendedor",
      name: "Vendedor",
      maxFinalPriceAdjustment: 10,
      canManageCatalog: false,
      canManageProposals: true,
      canManageUsers: false,
      isSystem: true
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@commercial.local" },
    update: {
      name: "Admin Comercial",
      passwordHash: adminPasswordHash,
      profileId: adminProfile.id,
      status: "ACTIVE"
    },
    create: {
      name: "Admin Comercial",
      email: "admin@commercial.local",
      passwordHash: adminPasswordHash,
      profileId: adminProfile.id,
      status: "ACTIVE"
    }
  });

  const baseItems = [
    {
      code: "CAT-PRODUTO",
      name: "Produto",
      category: "Produto",
      subcategory: "Geral",
      type: "PRODUCT",
      unit: "UN",
      baseCost: 0,
      referencePrice: 0,
      commercialDescription: "Categoria base de produtos",
      active: true,
      createdById: adminUser.id,
      updatedById: adminUser.id
    },
    {
      code: "CAT-SERVICO",
      name: "Servico",
      category: "Servico",
      subcategory: "Geral",
      type: "SERVICE",
      unit: "VB",
      baseCost: 0,
      referencePrice: 0,
      commercialDescription: "Categoria base de servicos",
      operationalDescription: "Categoria base de servicos",
      active: true,
      createdById: adminUser.id,
      updatedById: adminUser.id
    }
  ];

  for (const item of baseItems) {
    await prisma.commercialItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        type: item.type,
        unit: item.unit,
        baseCost: item.baseCost,
        referencePrice: item.referencePrice,
        commercialDescription: item.commercialDescription,
        operationalDescription: item.operationalDescription,
        active: item.active,
        updatedById: item.updatedById
      },
      create: item
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
