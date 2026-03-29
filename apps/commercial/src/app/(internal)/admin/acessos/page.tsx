import React from "react";
import { db } from "@/lib/db";
import { requireCommercialSession } from "@/lib/auth/session";
import { Shield, ShieldAlert } from "lucide-react";
import { AccessTable } from "./_components/access-table";

export default async function ExternalAccessPage() {
  const user = await requireCommercialSession();

  if (!user.canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4 bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200">
        <div className="p-6 bg-red-50 text-red-500 rounded-3xl shadow-lg">
          <ShieldAlert size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Acesso Restrito</h2>
          <p className="text-muted font-medium mt-2">Você não possui permissão para gerenciar acessos externos.</p>
        </div>
      </div>
    );
  }

  const publicLinks = await db.proposalPublicLink.findMany({
    include: {
      proposalVersion: {
        include: {
          proposal: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="admin-page-container p-8">
      <header className="page-header-premium mb-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="icon-badge-accent p-5 bg-accent text-white rounded-3xl shadow-xl shadow-accent/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
            <Shield size={32} className="relative z-10" />
          </div>
          <div>
            <h1 className="section-title-premium text-4xl font-black text-slate-800 tracking-tight">Audit de Acessos Externos</h1>
            <p className="text-muted font-medium mt-1">Monitore, rastreie e revogue links públicos de propostas comerciais.</p>
          </div>
        </div>
      </header>

      <div className="dash-card-glass p-0 overflow-hidden shadow-2xl dash-card-elevation border-slate-100/50">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-accent rounded-full shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)]"></div>
              <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">REGISTROS DE LINKS PÚBLICOS</h3>
           </div>
        </div>
        
        <AccessTable publicLinks={publicLinks} />
      </div>
    </div>
  );
}
