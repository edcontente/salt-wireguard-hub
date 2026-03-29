"use client";

import React from "react";
import { TrendingUp, Target, DollarSign, Award, ArrowUpRight, BarChart3 } from "lucide-react";

type PerformanceProps = {
  goal: {
    target: number;
    current: number;
    percentage: number;
  };
  userName?: string;
};

export function HomePerformance({ goal, userName }: PerformanceProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const percentage = Math.min(Math.round((goal.current / goal.target) * 100) || 0, 100);

  return (
    <div className="dash-card-glass hover-scale relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 text-accent/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500">
        <BarChart3 size={120} />
      </div>

      <div className="p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <Target size={24} />
              </div>
              Minha Performance
            </h2>
            <p className="text-muted text-sm font-medium mt-1">Status da meta individual - {new Date().toLocaleString('pt-BR', { month: 'long' })}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">
              MENSAL
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={14} /> Total Vendido
              </span>
              <div className="flex items-baseline gap-2">
                <strong className="text-4xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(goal.current)}
                </strong>
                {percentage > 0 && (
                  <span className="text-emerald-500 flex items-center gap-0.5 text-sm font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    <ArrowUpRight size={14} /> {percentage}%
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Award size={14} /> Meta Estimada
              </span>
              <strong className="text-2xl font-bold text-slate-500">
                {formatCurrency(goal.target)}
              </strong>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center">
            {/* Circular Progress (Simplified SVG) */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - percentage / 100)}
                strokeLinecap="round"
                className="text-accent transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-slate-800">{percentage}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Concluído</span>
            </div>
          </div>
        </div>

        <div className="mt-10 p-5 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-accent">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Potencial de Faturamento</p>
              <p className="text-sm font-black text-slate-800">Crescimento de 12% vs mês anterior</p>
            </div>
          </div>
          <button className="p-2 rounded-xl border border-slate-200 hover:border-accent hover:text-accent transition-all bg-white shadow-sm">
            <ArrowUpRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
