import React from "react";
import { db } from "@/lib/db";
import { requireCommercialSession } from "@/lib/auth/session";
import { GoalsDashboard } from "./_components/goals-dashboard";
import { Target, TrendingUp, Info } from "lucide-react";

export default async function GoalsAdminPage() {
  const admin = await requireCommercialSession();

  if (!admin.canManageUsers) {
    return <div className="p-12 text-center text-muted">Acesso negado.</div>;
  }

  const goals = await db.salesGoal.findMany({
    include: { user: true },
    orderBy: [
      { year: "desc" },
      { month: "desc" }
    ]
  });

  const users = await db.user.findMany({
    where: { profile: { slug: "comercial" } },
    orderBy: { name: "asc" }
  });

  const currentYear = new Date().getFullYear();
  const yearTotal = goals
    .filter(g => g.year === currentYear && !g.userId)
    .reduce((acc, g) => acc + g.targetAmount, 0);

  return (
    <div className="admin-page-container p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="page-header-premium mb-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="icon-badge-accent p-4 bg-accent text-white rounded-[24px] shadow-lg shadow-accent/20">
            <Target size={32} />
          </div>
          <div>
            <h1 className="section-title-premium text-3xl font-black text-slate-800 tracking-tight">Metas de Vendas</h1>
            <p className="text-muted font-medium mt-1">Planejamento estratégico de faturamento para {currentYear}.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-10">
         <div className="dash-card-glass p-6 group hover-scale bg-gradient-to-br from-indigo-50/50 to-white">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                  <TrendingUp size={16} />
               </div>
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">TOTAL PLANEJADO ({currentYear})</p>
            </div>
            <div className="flex items-end gap-2">
               <p className="text-2xl font-black text-slate-800 tracking-tighter">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(yearTotal)}
               </p>
               <span className="text-[9px] font-black text-indigo-500 mb-1 bg-white px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm">GLOBAL</span>
            </div>
         </div>

         <div className="dash-card-glass p-6 group hover-scale bg-gradient-to-br from-blue-50/50 to-white">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                  <Target size={16} />
               </div>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">METAS CONFIGURADAS</p>
            </div>
            <div className="flex items-end gap-2">
               <p className="text-2xl font-black text-slate-800 tracking-tighter">{goals.length}</p>
               <span className="text-[9px] font-black text-blue-500 mb-1 bg-white px-2 py-0.5 rounded-full border border-blue-100 shadow-sm">REGISTROS</span>
            </div>
         </div>

         <div className="md:col-span-2 dash-card-glass p-0 overflow-hidden bg-gradient-to-r from-accent/5 to-transparent border-accent/10 group">
            <div className="flex h-full">
               <div className="bg-accent w-2" />
               <div className="p-6 flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-accent ring-8 ring-accent/5 group-hover:scale-110 transition-transform">
                     <Info size={28} />
                  </div>
                  <div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Metodologia Comercial</h3>
                     <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-sm">
                        O sistema prioriza a <strong className="text-accent underline decoration-accent/30">Meta Individual</strong> de cada vendedor. No entanto, vendedores sem meta pessoal seguem automaticamente a <strong className="text-slate-700">Meta Global</strong> da empresa.
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <GoalsDashboard initialGoals={goals} users={users} />
    </div>
  );
}
