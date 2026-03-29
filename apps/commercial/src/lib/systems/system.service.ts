import { db } from "@/lib/db";

export async function listGlobalSystems() {
  return db.globalSystem.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });
}

export async function createGlobalSystem(name: string) {
  // Use a generated ID or auto-calc
  const id = name.toLowerCase().replace(/\s+/g, "_");
  return db.globalSystem.upsert({
    where: { id },
    update: { active: true },
    create: {
      id,
      name,
      active: true,
      updatedAt: new Date()
    }
  });
}

export async function deleteGlobalSystem(id: string) {
  return db.globalSystem.update({
    where: { id },
    data: { active: false }
  });
}
