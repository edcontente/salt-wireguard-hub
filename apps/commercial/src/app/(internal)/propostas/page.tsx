import React from "react";
import Link from "next/link";
import { PlusCircle, FileText, Search, Filter, TrendingUp } from "lucide-react";
import { requireCommercialSession } from "@/lib/auth/session";
import { listProposalSummaries } from "@/lib/proposals/proposal.service";
import { ProposalsTable } from "./_components/proposals-table";

export default async function ProposalsPage() {
  const user = await requireCommercialSession();

  if (!user.canManageProposals) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4 bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200">
        <div className="p-6 bg-red-50 text-red-500 rounded-3xl shadow-lg">
          <FileText size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Acesso Restrito</h2>
          <p className="text-muted font-medium mt-2">Você não possui permissão para gerenciar propostas comerciais.</p>
        </div>
      </div>
    );
  }

  const proposals = await listProposalSummaries();

  return (
    <div className="proposals-page-container p-8">
      <header className="page-header-premium mb-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="icon-badge-accent p-5 bg-accent text-white rounded-3xl shadow-xl shadow-accent/30 relative">
             <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse"></div>
            <FileText size={32} className="relative z-10" />
          </div>
          <div>
            <h1 className="section-title-premium text-4xl font-black text-slate-800 tracking-tight">Pipeline Comercial</h1>
            <p className="text-muted font-medium mt-1">Acompanhe o status e a evolução das propostas enviadas aos clientes.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <Link href="/propostas/nova" className="btn-submit !py-4 !px-10 text-sm font-black flex items-center gap-3 shadow-2xl hover:shadow-accent/40 rounded-[22px] no-underline transition-all hover:scale-105 active:scale-95">
              <PlusCircle size={22} /> Nova Proposta
           </Link>
        </div>
      </header>

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
         {[
           { label: "EM RASCUNHO", val: proposals.filter(p => p.status === "DRAFT").length, color: "slate" },
           { label: "ENVIADAS", val: proposals.filter(p => p.status === "SENT").length, color: "blue" },
           { label: "APROVADAS", val: proposals.filter(p => p.status === "APPROVED").length, color: "emerald" },
           { label: "RECUSADAS", val: proposals.filter(p => p.status === "REJECTED").length, color: "red" },
         ].map((stat, i) => (
           <div key={i} className="dash-card-glass p-6 group hover-scale">
              <div className="flex flex-col gap-1">
                 <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-${stat.color}-500/60`}>
                    {stat.label}
                 </span>
                 <div className="flex items-end justify-between">
                    <strong className="text-2xl font-black text-slate-800">{stat.val}</strong>
                    <TrendingUp size={16} className={`text-${stat.color}-500 opacity-20 group-hover:opacity-100 transition-opacity`} />
                 </div>
              </div>
           </div>
         ))}
      </section>

      {/* Main Table Content */}
      <section className="dash-card-glass p-0 overflow-hidden shadow-2xl dash-card-elevation border-slate-100/50">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-accent rounded-full shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)]"></div>
              <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">LISTAGEM DE PROPOSTAS</h3>
           </div>
           
           <div className="flex items-center gap-2">
              <button className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-800 shadow-sm transition-all">
                 <Filter size={18} />
              </button>
           </div>
        </div>
        
        <ProposalsTable proposals={proposals} />
      </section>
    </div>
  );
}
