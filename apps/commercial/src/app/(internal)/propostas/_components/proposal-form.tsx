"use client";

import React, { useState, useRef } from "react";
import { 
  FileText, 
  User as UserIcon, 
  Mail, 
  ArrowRight, 
  RotateCcw, 
  Info,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";
import { createProposalAction } from "../actions";
import { CustomerSelector, Customer } from "@/components/customer-selector";

export function ProposalForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // A submissão será via Server Action padrão no form,
    // mas controlamos o estado do botão aqui.
    setIsSubmitting(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <header className="px-2">
         <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shadow-xl shadow-accent/20">
               <FileText size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Inicializar Proposta</h2>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuração de novo rascunho</p>
            </div>
         </div>
      </header>

      <form 
        ref={formRef} 
        action={createProposalAction}
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-12 gap-8"
      >
         {/* Lado Esquerdo: Dados Básicos (Col 7) */}
         <div className="md:col-span-12 space-y-8">
            <div className="dash-card-glass p-8 group relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/10 transition-all duration-700"></div>
               
               <div className="space-y-10 relative z-10">
                  {/* Título da Proposta */}
                  <div className="form-group-premium space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <FileText size={12} className="text-accent" /> Título de Referência
                     </label>
                     <div className="relative">
                        <input 
                           name="title" 
                           type="text" 
                           className="form-input !py-5 !px-6 text-xl font-black tracking-tight !rounded-2xl border-slate-200 focus:border-accent shadow-sm placeholder:text-slate-200" 
                           required 
                           placeholder="Ex: Projeto Residencial GBR..." 
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-slate-50 rounded-lg text-slate-300">
                           <Clock size={16} />
                        </div>
                     </div>
                  </div>

                  {/* Seleção de Cliente */}
                  <div className="form-group-premium space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <UserIcon size={12} className="text-accent" /> Cliente da Proposta
                     </label>
                     <CustomerSelector onSelect={setSelectedCustomer} />
                     
                     {selectedCustomer && (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                           <CheckCircle2 size={16} className="text-emerald-500" />
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              Dados vinculados com sucesso
                           </span>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Rodapé e Ação */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
               <div className="flex items-center gap-4 text-slate-400 max-w-md">
                  <div className="p-3 bg-slate-100 rounded-xl">
                     <Info size={16} />
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed italic">
                     Ao criar, você será redirecionado para o **Editor Técnico** onde poderá incluir sistemas, ambientes e precificação.
                  </p>
               </div>

               <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-auto btn-submit !py-5 !px-16 text-sm font-black shadow-2xl shadow-accent/30 flex items-center justify-center gap-3 border-b-4 border-accent-hover active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 group"
               >
                  {isSubmitting ? (
                     <RotateCcw className="animate-spin" size={20} />
                  ) : (
                     <>
                        AVANÇAR PARA EDIÇÃO
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                     </>
                  )}
               </button>
            </div>
         </div>
         
         {/* Mini Cards de Contexto (Opcional - Estilo Metas) */}
         <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="dash-card-glass p-6 border-l-4 border-l-blue-500">
               <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Estatística</span>
               </div>
               <p className="text-xs font-bold text-slate-600">Propostas com títulos claros fecham 15% mais rápido.</p>
            </div>
            
            <div className="dash-card-glass p-6 border-l-4 border-l-amber-500">
               <div className="flex items-center gap-3 mb-2">
                  <Mail size={16} className="text-amber-500" />
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Lembrete</span>
               </div>
               <p className="text-xs font-bold text-slate-600">O cliente receberá um rascunho apenas se você compartilhar o link.</p>
            </div>

            <div className="dash-card-glass p-6 border-l-4 border-l-accent">
               <div className="flex items-center gap-3 mb-2">
                  <Clock size={16} className="text-accent" />
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Histórico</span>
               </div>
               <p className="text-xs font-bold text-slate-600">Revisões são salvas automaticamente em cada alteração.</p>
            </div>
         </div>
      </form>
    </div>
  );
}
