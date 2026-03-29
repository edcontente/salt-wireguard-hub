import { db } from "@/lib/db";

export async function listPricingRules() {
  return db.pricingRule.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });
}

export async function createPricingRule(data: {
  name: string;
  category?: string;
  subcategory?: string;
  marginMultiplier: number;
}) {
  const id = data.name.toLowerCase().replace(/\s+/g, "_");
  return db.pricingRule.upsert({
    where: { id },
    update: { ...data, active: true },
    create: {
      id,
      ...data,
      active: true,
      updatedAt: new Date()
    }
  });
}

export async function deletePricingRule(id: string) {
  return db.pricingRule.update({
    where: { id },
    data: { active: false }
  });
}
