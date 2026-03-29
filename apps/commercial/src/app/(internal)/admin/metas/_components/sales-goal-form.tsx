"use client";

import React, { useEffect, useState, useRef } from "react";
import { upsertSalesGoalAction } from "../../actions";
import { 
  Target, 
  Calendar, 
  DollarSign, 
  User as UserIcon, 
  TrendingUp, 
  Plus, 
  Save, 
  RotateCcw,
  Info
} from "lucide-react";

type SalesGoalFormProps = {
  goal?: any | null;
  users: any[];
  onSuccess: () => void;
  onClear: () => void;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function SalesGoalForm({ goal, users, onSuccess, onClear }: SalesGoalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targetAmount: "",
    userId: "" as string | null,
    repeatAllYear: false
  });
  const [isAnnualMode, setIsAnnualMode] = useState(false);

  useEffect(() => {
    if (goal) {
      setFormData({
        month: goal.month,
        year: goal.year,
        targetAmount: goal.targetAmount.toString(),
        userId: goal.userId,
        repeatAllYear: false
      });
      setIsAnnualMode(false); // Sempre iniciar em mensal ao editar
    } else {
      setFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        targetAmount: "",
        userId: "",
        repeatAllYear: false
      });
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      if (goal?.id) fd.append("id", goal.id);
      
      // Enviar os flags de modo para a action
      if (isAnnualMode) {
         fd.append("isAnnual", "true");
      } else if (formData.repeatAllYear) {
         fd.set("repeatAllYear", "true");
      }

      await upsertSalesGoalAction(fd);
      onSuccess();
      if (!goal) {
         formRef.current?.reset();
         setFormData({
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            targetAmount: "",
            userId: "",
            repeatAllYear: false
         });
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar meta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthlyAverage = parseFloat(formData.targetAmount) / 12;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shadow-sm">
               {goal ? <Save size={20} /> : <Plus size={20} />}
            </div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
               {goal ? "Editar Objetivo" : "Configurar Meta"}
            </h2>
         </div>
         {goal && (
            <button 
               onClick={onClear}
               className="text-[10px] font-black text-slate-400 hover:text-slate-800 flex items-center gap-2 uppercase tracking-widest transition-all"
            >
               <RotateCcw size={12} /> Limpar Seleção
            </button>
         )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
         {/* Seletor de Modo (Premium) */}
         <div className="p-1.5 bg-slate-100 rounded-[1.5rem] border border-slate-200/50 flex items-center gap-1 shadow-inner">
            <button 
               type="button"
               onClick={() => setIsAnnualMode(false)}
               className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isAnnualMode ? 'bg-white text-accent shadow-md shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Meta Mensal
            </button>
            <button 
               type="button"
               onClick={() => setIsAnnualMode(true)}
               className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isAnnualMode ? 'bg-white text-accent shadow-md shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
               Plano Anual
            </button>
         </div>

         {/* Card 1: Contexto (Responsável e Período) */}
         <div className="dash-card-glass p-8 group overflow-visible">
            <div className="space-y-8">
               <div className="form-group-premium space-y-3">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={12} className="text-accent" /> Responsável pela Meta
                     </label>
                  </div>
                  <select 
                     name="userId" 
                     className="form-select font-bold !py-4 text-sm !rounded-2xl" 
                     value={formData.userId || ""}
                     onChange={(e) => setFormData({ ...formData, userId: e.target.value || null })}
                  >
                     <option value="">🎯 META GLOBAL DA EMPRESA</option>
                     {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                     ))}
                  </select>
               </div>

               <div className={`grid ${isAnnualMode ? 'grid-cols-1' : 'grid-cols-2'} gap-6 transition-all duration-300`}>
                  {!isAnnualMode && (
                     <div className="form-group-premium space-y-3 animate-in fade-in slide-in-from-left-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <Calendar size={12} className="text-accent" /> Mês
                        </label>
                        <select 
                           name="month" 
                           className="form-select font-bold !py-4 text-sm !rounded-2xl" 
                           required={!isAnnualMode}
                           value={formData.month}
                           onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                        >
                           {MONTH_NAMES.map((m, i) => (
                              <option key={i+1} value={i+1}>{m}</option>
                           ))}
                        </select>
                     </div>
                  )}
                  <div className="form-group-premium space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} className="text-accent" /> Ano Base
                     </label>
                     <select 
                        name="year" 
                        className="form-select font-bold !py-4 text-sm !rounded-2xl" 
                        required
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                     >
                        {[2024, 2025, 2026].map(y => (
                           <option key={y} value={y}>{y}</option>
                        ))}
                     </select>
                  </div>
               </div>
            </div>
         </div>

         {/* Card 2: Valor e Atributos */}
         <div className="dash-card-glass p-8 group bg-gradient-to-br from-indigo-50/30 to-white">
            <div className="space-y-8">
               <div className="form-group-premium space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <DollarSign size={12} className="text-accent" /> {isAnnualMode ? "Meta Bruta Anual (R$)" : "Meta de Faturamento (R$)"}
                  </label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">R$</span>
                     <input 
                        name="targetAmount" 
                        type="number" 
                        step="0.01"
                        className="form-input !pl-14 !py-5 text-2xl font-black tracking-tight !rounded-3xl border-slate-200 focus:border-accent shadow-sm" 
                        required 
                        value={formData.targetAmount}
                        onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                        placeholder="0,00" 
                     />
                  </div>
                  {isAnnualMode && !isNaN(monthlyAverage) && (
                     <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between group-hover:shadow-md transition-all animate-in slide-in-from-top-2">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Média por Mês:</span>
                        <span className="text-xs font-black text-emerald-800">
                           {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(monthlyAverage)}
                        </span>
                     </div>
                  )}
               </div>

               {!isAnnualMode && (
                  <div className="flex items-center gap-4 p-5 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md animate-in fade-in">
                     <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                           type="checkbox" 
                           name="repeatAllYear" 
                           className="sr-only peer"
                           id="repeat-all-year-static"
                           checked={formData.repeatAllYear}
                           onChange={() => setFormData({ ...formData, repeatAllYear: !formData.repeatAllYear })}
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent ring-4 ring-transparent peer-checked:ring-accent/10"></div>
                     </div>
                     <label htmlFor="repeat-all-year-static" className="text-[11px] font-black text-slate-600 cursor-pointer select-none uppercase tracking-tight">
                        Replicar este valor para o ano ({formData.year})
                     </label>
                  </div>
               )}
            </div>
         </div>

         {/* Card 3: Ações e Info */}
         <div className="space-y-4">
            <button 
               type="submit" 
               disabled={isSubmitting}
               className="w-full btn-submit !py-5 !px-12 text-sm font-black shadow-2xl shadow-accent/30 flex items-center justify-center gap-3 border-b-4 border-accent-hover active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50"
            >
               {isSubmitting ? (
                  <RotateCcw className="animate-spin" size={20} />
               ) : (
                  <>
                     <TrendingUp size={20} /> 
                     {isAnnualMode ? "DEFINIR PLANO ANUAL" : (goal ? "ATUALIZAR OBJETIVO" : "ESTABELECER META")}
                  </>
               )}
            </button>

            <div className="p-6 rounded-3xl bg-slate-900 overflow-hidden relative group border border-slate-800 shadow-xl">
               <div className="absolute top-0 right-0 p-4 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform">
                  <Info size={48} />
               </div>
               <p className="text-[9px] font-black text-accent-hover uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Info size={12} /> Planejamento Estratégico
               </p>
               <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic">
                  {isAnnualMode 
                    ? "Defina o faturamento total desejado par o ano. O sistema fará a divisão equitativa entre os meses."
                    : "Ideal para ajustes finos em meses específicos ou metas sazonais."}
               </p>
            </div>
         </div>
      </form>
    </div>
  );
}
