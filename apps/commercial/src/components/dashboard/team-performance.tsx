"use client";

import React from "react";
import { Users, TrendingUp, Target, DollarSign, Award, ChevronRight } from "lucide-react";

type TeamPerformanceProps = {
  data: {
    individualGoals: any[];
    globalGoal: any | null;
    totalIndividualTarget: number;
  };
};

export function TeamPerformance({ data }: TeamPerformanceProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const teamTarget = data.totalIndividualTarget;
  const companyTarget = data.globalGoal?.targetAmount || 0;

  return (
    <div className="dash-card-glass hover-scale relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 text-blue-500/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500">
        <Users size={120} />
      </div>

      <div className="p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
                <Users size={24} />
              </div>
              Visão da Equipe
            </h2>
            <p className="text-muted text-sm font-medium mt-1">Consolidado de metas dos vendedores</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest">
              ADMINISTRATIVO
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SOMA DAS METAS INDIVIDUAIS</p>
            <strong className="text-2xl font-black text-slate-800">{formatCurrency(teamTarget)}</strong>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-900/20">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">META GLOBAL (EMPRESA)</p>
            <strong className="text-2xl font-black">{formatCurrency(companyTarget)}</strong>
          </div>

          <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">FRENTE VENDEDORA</p>
            <strong className="text-2xl font-black text-emerald-700">{data.individualGoals.length}</strong>
            <span className="text-[10px] font-bold text-emerald-600 ml-2">VENDEDORES ATIVOS</span>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ranking de Projeção</p>
          {data.individualGoals.slice(0, 3).map((goal, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{goal.user.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(goal.targetAmount)}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
