"use client";

import React, { useEffect, useState } from "react";
import { upsertSalesGoalAction } from "../../actions";
import { X, Target, Calendar, DollarSign, User, TrendingUp } from "lucide-react";

type GoalFormProps = {
  isOpen: boolean;
  onClose: () => void;
  goal?: any | null;
  users: any[];
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function GoalForm({ isOpen, onClose, goal, users }: GoalFormProps) {
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targetAmount: "",
    userId: "" as string | null
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        month: goal.month,
        year: goal.year,
        targetAmount: goal.targetAmount.toString(),
        userId: goal.userId
      });
    } else {
      setFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        targetAmount: "",
        userId: null
      });
    }
  }, [goal, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="catalog-modal-overlay">
      <div className="catalog-modal dash-card-glass !max-w-xl flex flex-col overflow-hidden !h-auto max-h-[90vh]">
        <header className="catalog-modal__header p-8 flex justify-between items-center border-b border-slate-100 bg-slate-50/50 shrink-0">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20">
                 <Target size={24} />
              </div>
              <div>
                 <h3 className="font-black text-slate-800 text-xl tracking-tight">
                    {goal ? "Editar Meta" : "Definir Meta"}
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configure os objetivos comerciais</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white text-slate-400 transition-all border border-transparent hover:border-slate-100 hover:shadow-sm">
              <X size={20} />
           </button>
        </header>

        <form action={async (fd) => {
          if (goal?.id) fd.append("id", goal.id);
          await upsertSalesGoalAction(fd);
          onClose();
        }} className="flex flex-col overflow-hidden">
           
           <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-180px)] thin-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                 <div className="form-group-premium space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={12} className="text-accent" /> Mês de Referência
                    </label>
                    <select 
                       name="month" 
                       className="form-select font-bold !py-3 text-sm" 
                       required
                       defaultValue={formData.month}
                    >
                       {MONTH_NAMES.map((m, i) => (
                          <option key={i+1} value={i+1}>{m}</option>
                       ))}
                    </select>
                 </div>
                 <div className="form-group-premium space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={12} className="text-accent" /> Ano
                    </label>
                    <select 
                       name="year" 
                       className="form-select font-bold !py-3 text-sm" 
                       required
                       defaultValue={formData.year}
                    >
                       {[2024, 2025, 2026].map(y => (
                          <option key={y} value={y}>{y}</option>
                       ))}
                    </select>
                 </div>
              </div>

              <div className="form-group-premium space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} className="text-accent" /> Atribuir a Responsável
                 </label>
                 <select 
                    name="userId" 
                    className="form-select font-bold !py-3 text-sm" 
                    required
                    defaultValue={formData.userId || ""}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value || null })}
                 >
                    <option value="">🎯 META GLOBAL DA EMPRESA</option>
                    {users.map(u => (
                       <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                 </select>
              </div>

              <div className="form-group-premium space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={12} className="text-accent" /> Alvo de Faturamento (R$)
                 </label>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">R$</span>
                    <input 
                       name="targetAmount" 
                       type="number" 
                       step="0.01"
                       className="form-input !pl-11 !py-4 text-xl font-black tracking-tight" 
                       required 
                       defaultValue={formData.targetAmount}
                       placeholder="0,00" 
                    />
                 </div>
              </div>

              {!goal && (
                <div className="flex items-center gap-3 p-5 rounded-2xl bg-blue-50/50 border border-blue-100/50 group cursor-pointer transition-all hover:bg-blue-50">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="repeatAllYear" 
                      value="true" 
                      className="sr-only peer"
                      id="repeat-all-year"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                  </div>
                  <label htmlFor="repeat-all-year" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Repetir esta meta para todos os meses do ano ({formData.year})
                  </label>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-slate-900 text-white flex items-center gap-4 relative overflow-hidden group">
                 <div className="w-10 h-10 bg-accent text-white flex items-center justify-center rounded-xl shadow-lg shrink-0">
                    <Target size={20} />
                 </div>
                 <div className="relative z-10">
                    <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-0.5">Dica Salt</p>
                    <p className="text-[11px] font-medium text-slate-300 leading-tight">
                       Defina objetivos desafiadores porém realistas para 2026.
                    </p>
                 </div>
              </div>
           </div>

           <footer className="p-8 flex justify-end gap-4 border-t border-slate-100 bg-slate-50/30 shrink-0">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black text-slate-400 hover:text-slate-800 transition-all">
                 Sair sem Salvar
              </button>
              <button type="submit" className="btn-submit !py-3 !px-10 text-xs font-black shadow-xl shadow-accent/20 flex items-center gap-3 border-b-4 border-accent-hover active:border-b-0 active:translate-y-1 transition-all">
                 <TrendingUp size={16} /> {goal ? "Atualizar Meta" : "Definir Meta"}
              </button>
           </footer>
        </form>
      </div>
    </div>
  );
}
