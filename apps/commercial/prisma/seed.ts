import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
      passwordHash: "$2b$12$commercial.seed.password.hash.placeholder",
      profileId: adminProfile.id,
      status: "ACTIVE"
    },
    create: {
      name: "Admin Comercial",
      email: "admin@commercial.local",
      passwordHash: "$2b$12$commercial.seed.password.hash.placeholder",
      profileId: adminProfile.id,
      status: "ACTIVE"
    }
  });

  const baseItems = [
    {
      code: "CAT-PRODUTO",
      name: "Produto",
      description: "Categoria base de produtos",
      category: "Produto",
      type: "PRODUCT",
      unitPrice: 0,
      active: true,
      createdById: adminUser.id,
      updatedById: adminUser.id
    },
    {
      code: "CAT-SERVICO",
      name: "Servico",
      description: "Categoria base de servicos",
      category: "Servico",
      type: "SERVICE",
      unitPrice: 0,
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
        description: item.description,
        category: item.category,
        type: item.type,
        unitPrice: item.unitPrice,
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
