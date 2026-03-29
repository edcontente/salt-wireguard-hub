import { db } from "@/lib/db";

export async function getSalesGoals(userId?: string | null) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // 1. Tentar buscar meta individual
  let goal = null;
  if (userId) {
    goal = await db.salesGoal.findFirst({
      where: { month, year, userId }
    });
  }

  // 2. Fallback para meta global se não houver individual
  if (!goal) {
    goal = await db.salesGoal.findFirst({
      where: { month, year, userId: null }
    });
  }

  return {
    target: goal?.targetAmount || 0,
    current: 0, // Mocked for now
    percentage: goal?.targetAmount ? 0 : 0
  };
}

export async function getAnnouncements() {
  return db.announcement.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getTeamPerformance(month: number, year: number) {
  const individualGoals = await db.salesGoal.findMany({
    where: { month, year, userId: { not: null } },
    include: { user: true }
  });

  const globalGoal = await db.salesGoal.findFirst({
    where: { month, year, userId: null }
  });

  return {
    individualGoals,
    globalGoal,
    totalIndividualTarget: individualGoals.reduce((acc, g) => acc + g.targetAmount, 0)
  };
}
