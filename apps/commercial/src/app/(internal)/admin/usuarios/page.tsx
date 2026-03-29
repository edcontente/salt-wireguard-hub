import React from "react";
import { db } from "@/lib/db";
import { requireCommercialSession } from "@/lib/auth/session";
import { UserTable } from "./_components/user-table";
import { UserPlus, ShieldCheck } from "lucide-react";

export default async function UsersAdminPage() {
  const admin = await requireCommercialSession();

  if (!admin.canManageUsers) {
    return <div className="p-12 text-center text-muted">Acesso negado.</div>;
  }

  const users = await db.user.findMany({
    include: { profile: true },
    orderBy: { name: "asc" }
  });

  const profiles = await db.profile.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="admin-page-container p-8">
      <header className="page-header-premium mb-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="icon-badge-accent p-4 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="section-title-premium text-3xl font-black text-slate-800">Controle de Acessos</h1>
            <p className="text-muted font-medium mt-1">Gerencie usuários, perfis e permissões do sistema Salt.</p>
          </div>
        </div>
      </header>

      <div className="dash-card-glass p-0 overflow-hidden shadow-xl">
        <UserTable users={users} profiles={profiles} />
      </div>
    </div>
  );
}
