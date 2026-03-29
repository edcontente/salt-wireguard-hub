import React from "react";
import { db } from "@/lib/db";
import { requireCommercialSession } from "@/lib/auth/session";
import { MuralTable } from "./_components/mural-table";
import { Megaphone, LayoutDashboard } from "lucide-react";

export default async function MuralAdminPage() {
  const admin = await requireCommercialSession();

  if (!admin.canManageUsers) {
    return <div className="p-12 text-center text-muted">Acesso negado.</div>;
  }

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="admin-page-container p-8">
      <header className="page-header-premium mb-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="icon-badge-accent p-4 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20">
            <Megaphone size={32} />
          </div>
          <div>
            <h1 className="section-title-premium text-3xl font-black text-slate-800 tracking-tight">Mural de Avisos</h1>
            <p className="text-muted font-medium mt-1">Configure os comunicados que aparecem na tela inicial de todos os usuários.</p>
          </div>
        </div>
      </header>

      <div className="dash-card-glass p-0 overflow-hidden shadow-xl border-slate-100">
        <MuralTable announcements={announcements} />
      </div>
    </div>
  );
}
