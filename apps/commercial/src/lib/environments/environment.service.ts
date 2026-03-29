import { db } from "@/lib/db";

export async function listGlobalEnvironments() {
  return db.globalEnvironment.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });
}

export async function getStandardEnvironments() {
  return db.globalEnvironment.findMany({
    where: { active: true, isDefault: true },
    orderBy: { name: "asc" }
  });
}

export async function getPersonalizedEnvironments() {
  return db.globalEnvironment.findMany({
    where: { active: true, isDefault: false },
    orderBy: { name: "asc" }
  });
}

export async function createGlobalEnvironment(name: string, isDefault: boolean = false) {
  const id = name.toLowerCase().replace(/\s+/g, "_");
  return db.globalEnvironment.upsert({
    where: { id },
    update: { active: true, isDefault },
    create: {
      id,
      name,
      isDefault,
      active: true,
      updatedAt: new Date()
    }
  });
}

export async function deleteGlobalEnvironment(id: string) {
  return db.globalEnvironment.update({
    where: { id },
    data: { active: false }
  });
}
