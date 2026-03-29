import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronRight } from "lucide-react";
import { requireCommercialSession } from "@/lib/auth/session";
import { ProposalForm } from "../_components/proposal-form";

export default async function NewProposalPage() {
  const user = await requireCommercialSession();

  if (!user.canManageProposals) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4 bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200">
        <div className="p-6 bg-red-50 text-red-500 rounded-3xl shadow-lg">
          <FileText size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Acesso Restrito</h2>
          <p className="text-muted font-medium mt-2">Sua conta não tem permissão para criar propostas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="proposals-nova-container p-8 max-w-5xl mx-auto min-h-screen">
      {/* Breadcrumb / Navigation */}
      <nav className="mb-12 flex items-center justify-between pb-8 border-b border-slate-100">
         <div className="flex items-center gap-4">
            <Link 
               href="/propostas" 
               className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
            >
               <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
               <span className="text-slate-400">Comercial</span>
               <ChevronRight size={12} className="text-slate-300" />
               <span className="text-slate-400">Propostas</span>
               <ChevronRight size={12} className="text-slate-300" />
               <span className="text-accent">Nova Proposta</span>
            </div>
         </div>

         <div className="px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl">
            <span className="text-[10px] font-black text-accent uppercase tracking-tighter">VERSÃO 1.0 DRAFT</span>
         </div>
      </nav>

      {/* Main Form Component */}
      <main className="pb-20">
         <ProposalForm />
      </main>
    </div>
  );
}
