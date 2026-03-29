"use client";

import React, { useState } from "react";
import type {
  ProposalCatalogOption,
  ProposalEditorViewModel,
  ProposalFormAction
} from "@/lib/proposals/proposal-editor.types";
import { ProposalSectionEditor } from "./proposal-section-editor";
import { ProposalStatusBadge } from "./proposal-status-badge";
import { 
  ArrowLeft, 
  Settings, 
  Send, 
  FileDown, 
  Plus, 
  ChevronRight, 
  LayoutDashboard,
  Box,
  Cpu,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  BarChart3,
  RefreshCw,
  Eye,
  Info
} from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

type ProposalEditorProps = {
  proposal: ProposalEditorViewModel;
  catalogItems: ProposalCatalogOption[];
  globalSystems?: { id: string; name: string }[];
  globalEnvironments?: { id: string; name: string }[];
  addSectionAction: ProposalFormAction;
  addItemAction: ProposalFormAction;
  sendVersionAction: ProposalFormAction;
  createRevisionAction: ProposalFormAction;
  approveAction: ProposalFormAction;
  loseAction: ProposalFormAction;
  errorMessage?: string;
  showPurchaseOrderPrompt?: boolean;
};

export function ProposalEditor({
  proposal,
  catalogItems,
  globalSystems = [],
  globalEnvironments = [],
  addSectionAction,
  addItemAction,
  sendVersionAction,
  createRevisionAction,
  approveAction,
  loseAction,
  errorMessage,
  showPurchaseOrderPrompt
}: ProposalEditorProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  const editable = proposal.versionStatus === "DRAFT";
  const canReviewDecision = proposal.status === "SENT";
  const canCreateRevision = !editable && proposal.status === "SENT";
  
  const selectedSection = proposal.sections.find(s => s.id === selectedSectionId);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      {/* 1. TOP TOOLBAR */}
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <Link href="/propostas" className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-400 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-8 w-px bg-slate-100" />
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h1 className="text-xl font-black text-slate-800 tracking-tight">{proposal.title}</h1>
               <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest">{proposal.versionStatus}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-bold text-slate-400">#{proposal.number}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="font-bold text-slate-600 flex items-center gap-1.5 capitalize">
                <ProposalStatusBadge status={proposal.status} />
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-6 text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TOTAL GERADO</p>
             <p className="text-2xl font-black text-accent tracking-tighter">{formatCurrency(proposal.total)}</p>
          </div>
          
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
             <button className="p-2 rounded-xl text-slate-400 hover:bg-white hover:text-slate-600 transition-all shadow-sm group">
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
             </button>
             <button className="p-2 rounded-xl text-slate-400 hover:bg-white hover:text-slate-600 transition-all shadow-sm">
                <FileDown size={18} />
             </button>
             <button className="p-2 rounded-xl text-slate-400 hover:bg-white hover:text-slate-600 transition-all shadow-sm">
                <Settings size={18} />
             </button>
          </div>

          {editable && (
            <form action={sendVersionAction}>
              <button 
                type="submit"
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95"
              >
                <Send size={16} /> Enviar Versão
              </button>
            </form>
          )}
        </div>
      </header>

      {/* 2. MAIN 3-COLUMN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COL 1: INTERNAL NAVIGATION (GLASS) */}
        <aside className="w-72 border-r border-slate-100 flex flex-col bg-white overflow-y-auto px-4 py-6 thin-scrollbar">
          <div className="mb-8">
             <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Navegação</h3>
             <button 
                onClick={() => setSelectedSectionId(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all mb-2",
                  selectedSectionId === null 
                    ? "bg-accent/10 text-accent shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
             >
                <LayoutDashboard size={18} />
                <span>Visão Geral</span>
             </button>
          </div>

          <div className="mb-6">
             <div className="flex items-center justify-between px-4 mb-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistemas</h3>
               <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                 {proposal.sections.length}
               </span>
             </div>
             
             <div className="space-y-1">
                {proposal.sections.map((section) => (
                  <button 
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    className={cn(
                      "w-full group text-left px-4 py-3 rounded-2xl transition-all border border-transparent",
                      selectedSectionId === section.id 
                        ? "bg-white border-slate-100 shadow-xl shadow-slate-200/50" 
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                       <div className={cn(
                         "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                         selectedSectionId === section.id ? "bg-accent/10 text-accent" : "bg-slate-100 text-slate-400"
                       )}>
                          <Box size={14} />
                       </div>
                       <div className="flex-1 overflow-hidden">
                          <p className={cn(
                            "text-sm font-bold truncate",
                            selectedSectionId === section.id ? "text-slate-800" : "text-slate-500"
                          )}>{section.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{section.items.length} itens</p>
                       </div>
                    </div>
                  </button>
                ))}
             </div>
          </div>

          {/* ADD SYSTEM ACTION */}
          <div className="mt-4 px-2">
             <form action={addSectionAction} className="space-y-3">
                <select 
                  name="title" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all outline-none cursor-pointer"
                  required
                >
                  <option value="" disabled selected>Selecionar Sistema...</option>
                  {globalSystems.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="CUSTOM">Outro (Personalizado)...</option>
                </select>
                <button 
                  type="submit"
                  disabled={!editable}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs hover:border-accent hover:text-accent hover:bg-accent/5 transition-all disabled:opacity-50"
                >
                  <Plus size={14} /> Incluir Sistema
                </button>
             </form>
          </div>
        </aside>

        {/* COL 2: MAIN WORKAREA (DASHBOARD OR EDITOR) */}
        <main className="flex-1 overflow-y-auto px-10 py-8 thin-scrollbar bg-slate-50/30">
          {selectedSectionId === null ? (
            <div className="max-w-4xl mx-auto space-y-10">
               <header>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Visão Geral da Proposta</h2>
                  <p className="text-slate-500 font-medium">Resumo consolidado de todos os sistemas e ambientes.</p>
               </header>

               {/* DASHBOARD CARDS */}
               <div className="grid grid-cols-3 gap-6">
                  <div className="dash-card-glass p-8 group hover-scale active:scale-[0.98]">
                     <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center p-2 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm">
                           <TrendingUp size={24} />
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                     </div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">EFICIÊNCIA DE MARGEM</p>
                     <p className="text-4xl font-black text-slate-800 tracking-tighter mb-4">32.4%</p>
                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: '32.4%' }} />
                     </div>
                  </div>

                  <div className="dash-card-glass p-8 group hover-scale active:scale-[0.98]">
                     <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 text-accent flex items-center justify-center p-2 group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                           <Cpu size={24} />
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-accent transition-colors" />
                     </div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">SISTEMAS ATIVOS</p>
                     <p className="text-4xl font-black text-slate-800 tracking-tighter mb-1">{proposal.sections.length}</p>
                     <p className="text-xs font-bold text-slate-400">Pronto para envio técnico.</p>
                  </div>

                  <div className="dash-card-glass p-8 group hover-scale active:scale-[0.98]">
                     <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center p-2 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                           <AlertCircle size={24} />
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                     </div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">TOTAL DE EQUIPAMENTOS</p>
                     <p className="text-4xl font-black text-slate-800 tracking-tighter mb-1">
                        {proposal.sections.reduce((acc, s) => acc + s.items.length, 0)}
                     </p>
                     <p className="text-xs font-bold text-slate-400">Volume médio por ambiente.</p>
                  </div>
               </div>

               {/* DISTRIBUTION VIEW */}
               <div className="dash-card-glass p-10">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <BarChart3 size={20} className="text-accent" /> Distribuição por Sistema
                     </h3>
                     <span className="text-xs font-bold text-slate-400 underline cursor-pointer">Ver Relatórios Detalhados</span>
                  </div>
                  <div className="space-y-8">
                     {proposal.sections.length > 0 ? (
                       proposal.sections.map(section => {
                          const sectionTotal = section.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
                          const percentage = (sectionTotal / proposal.total) * 100;
                          return (
                            <div key={section.id}>
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-slate-700">{section.title}</span>
                                  <span className="text-sm font-black text-slate-800">{formatCurrency(sectionTotal)}</span>
                               </div>
                               <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-accent rounded-full" style={{ width: `${percentage}%` }} />
                               </div>
                            </div>
                          )
                       })
                     ) : (
                       <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[32px]">
                          <HelpCircle size={40} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-bold">Inicie adicionando um sistema para ver a distribuição.</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
               {selectedSection && (
                 <ProposalSectionEditor
                   section={selectedSection}
                   catalogItems={catalogItems}
                   globalEnvironments={globalEnvironments}
                   addItemAction={addItemAction}
                   editable={editable}
                   maxFinalPriceAdjustment={proposal.maxFinalPriceAdjustment}
                 />
               )}
            </div>
          )}
        </main>

        {/* COL 3: CONTEXT PANEL & IA (RIGHT) */}
        <aside className="w-80 border-l border-slate-100 flex flex-col bg-white overflow-y-auto thin-scrollbar">
           {/* FINANCE PANEL */}
           <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                 <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
                    <TrendingUp size={16} />
                 </div>
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Resumo Financeiro</h3>
              </div>
              
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Produtos</span>
                    <span className="text-sm font-black text-slate-800">{formatCurrency(proposal.total * 0.85)}</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Serviços</span>
                    <span className="text-sm font-black text-slate-800">{formatCurrency(proposal.total * 0.15)}</span>
                 </div>
                 <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800">Total GBR</span>
                    <span className="text-xl font-black text-accent tracking-tighter">{formatCurrency(proposal.total)}</span>
                 </div>
              </div>
           </div>

           {/* IA SALT PANEL */}
           <div className="flex-1 flex flex-col p-8 bg-slate-50/20">
              <div className="flex items-center gap-2 mb-6">
                 <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                    <Cpu size={16} />
                 </div>
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Inteligência Salt</h3>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative mb-6">
                 <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white p-1.5 shadow-lg shadow-blue-200">
                    <Info size={16} />
                 </div>
                 <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    Analisei os itens técnicos. O seu desconto médio está em <strong className="text-accent underline">5%</strong>. Você ainda tem margem para ajustar até <strong className="text-slate-800">8%</strong> se necessário para fechar negócio.
                 </p>
              </div>

              <div className="space-y-2 mt-auto">
                 <button className="w-full py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:text-accent transition-all">
                    Análise de Margem
                 </button>
                 <button className="w-full py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:text-accent transition-all">
                    Gera Justificativa
                 </button>
                 <div className="flex gap-2">
                    <input 
                      placeholder="Como posso ajudar?" 
                      className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button className="p-2.5 bg-accent text-white rounded-xl shadow-lg shadow-blue-200 group active:scale-95 transition-all">
                       <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                 </div>
              </div>
           </div>
        </aside>

      </div>
    </div>
  );
}
