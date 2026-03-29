"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireCommercialSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

// --- GESTÃO DE USUÁRIOS ---

export async function upsertUserAction(formData: FormData) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const profileId = formData.get("profileId") as string;
  const status = formData.get("status") as string || "ACTIVE";

  if (!name || !email || !profileId) throw new Error("Campos obrigatórios faltando.");

  const data: any = {
    name,
    email: email.toLowerCase().trim(),
    profileId,
    status
  };

  if (password && password.length > 0) {
    data.passwordHash = await hashPassword(password);
  }

  if (id) {
    await db.user.update({ where: { id }, data });
  } else {
    if (!password) throw new Error("Senha é obrigatória para novos usuários.");
    await db.user.create({ data });
  }

  revalidatePath("/admin/usuarios");
}

export async function toggleUserStatusAction(id: string, currentStatus: string) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  await db.user.update({
    where: { id },
    data: { status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE" }
  });

  revalidatePath("/admin/usuarios");
}

export async function deleteUserAction(id: string) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  // Nota: Em um sistema real, poderíamos preferir o soft-delete.
  await db.user.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}

// --- MURAL DE ANÚNCIOS ---

export async function upsertAnnouncementAction(formData: FormData) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const type = formData.get("type") as string;
  const active = formData.get("active") === "true";

  if (!title || !content) throw new Error("Título e conteúdo são obrigatórios.");

  const data = { title, content, type, active };

  if (id) {
    await db.announcement.update({ where: { id }, data });
  } else {
    await db.announcement.create({ data });
  }

  revalidatePath("/admin/mural");
  revalidatePath("/"); // Revalidar a Home para mostrar o novo anúncio
}

export async function deleteAnnouncementAction(id: string) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  await db.announcement.delete({ where: { id } });
  revalidatePath("/admin/mural");
  revalidatePath("/");
}

// --- METAS DE VENDAS ---

export async function upsertSalesGoalAction(formData: FormData) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  const id = formData.get("id") as string;
  const monthInput = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  const targetAmount = parseFloat(formData.get("targetAmount") as string);
  const userId = formData.get("userId") as string || null;
  const repeatAllYearInput = formData.get("repeatAllYear") === "true";
  const isAnnual = formData.get("isAnnual") === "true";

  // Se for Meta Anual, o mês específico não é obrigatório (usamos 1 como padrão)
  const month = isAnnual ? (isNaN(monthInput) ? 1 : monthInput) : monthInput;

  if (isNaN(month) || isNaN(year) || isNaN(targetAmount)) throw new Error("Dados de meta inválidos.");

  // Se for Meta Anual, dividimos por 12 e replicamos para todos os meses
  const finalTargetAmount = isAnnual ? targetAmount / 12 : targetAmount;
  const repeatAllYear = isAnnual ? true : repeatAllYearInput;

  if (repeatAllYear) {
    // Lógica de replicação para o ano todo (Prioritária)
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    
    for (const m of months) {
      // Procurar se já existe registro para este mês/ano/responsável
      const existing = await db.salesGoal.findFirst({
        where: { month: m, year, userId }
      });

      if (existing) {
        await db.salesGoal.update({
          where: { id: existing.id },
          data: { targetAmount: finalTargetAmount }
        });
      } else {
        await db.salesGoal.create({
          data: { month: m, year, targetAmount: finalTargetAmount, userId }
        });
      }
    }
  } else if (id) {
    // Edição individual por ID
    await db.salesGoal.update({
      where: { id },
      data: { targetAmount: finalTargetAmount, userId }
    });
  } else {
    // Criação/Update individual de um único mês
    const existing = await db.salesGoal.findFirst({
      where: { month, year, userId }
    });

    if (existing) {
      await db.salesGoal.update({
        where: { id: existing.id },
        data: { targetAmount: finalTargetAmount }
      });
    } else {
      await db.salesGoal.create({
        data: { month, year, targetAmount: finalTargetAmount, userId }
      });
    }
  }

  revalidatePath("/admin/metas");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function deleteSalesGoalAction(id: string) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  await db.salesGoal.delete({ where: { id } });
  revalidatePath("/admin/metas");
}

// --- ACESSOS EXTERNOS (LINKS PÚBLICOS) ---

export async function revokePublicLinkAction(id: string) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  await db.proposalPublicLink.update({
    where: { id },
    data: { revokedAt: new Date() }
  });

  revalidatePath("/admin/acessos");
}

export async function bulkRevokePublicLinksAction(ids: string[]) {
  const admin = await requireCommercialSession();
  if (!admin.canManageUsers) throw new Error("Acesso negado.");

  await db.proposalPublicLink.updateMany({
    where: { id: { in: ids } },
    data: { revokedAt: new Date() }
  });

  revalidatePath("/admin/acessos");
}
