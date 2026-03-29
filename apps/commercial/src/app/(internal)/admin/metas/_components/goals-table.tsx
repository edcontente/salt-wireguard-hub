"use client";

import React, { useState } from "react";
import SmartTable, { ColumnConfig } from "@/components/smart-table";
import { Target, User, Calendar, Trash2, DollarSign, Edit2, TrendingUp } from "lucide-react";

type SalesGoalWithUser = {
  id: string;
  month: number;
  year: number;
  targetAmount: number;
  userId: string | null;
  user?: {
    name: string;
  } | null;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface GoalsTableProps {
  goals: SalesGoalWithUser[];
  onEdit: (goal: SalesGoalWithUser) => void;
  onDelete?: (id: string) => void;
}

export function GoalsTable({ goals, onEdit, onDelete }: GoalsTableProps) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const columns: ColumnConfig<SalesGoalWithUser>[] = [
    {
      key: "month",
      label: "Período",
      sortable: true,
      render: (goal) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-accent group-hover:text-white transition-all border border-slate-100/50">
             <Calendar size={18} />
          </div>
          <div className="font-bold text-slate-800">
            {MONTH_NAMES[goal.month - 1]} / {goal.year}
          </div>
        </div>
      )
    },
    {
      key: "userId",
      label: "Responsável",
      sortable: true,
      render: (goal) => (
        <div className="flex items-center gap-3">
          {goal.userId ? (
            <>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xs font-black ring-4 ring-white shadow-sm border border-blue-100">
                 {goal.user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-slate-600 text-sm">{goal.user?.name}</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg border border-slate-700">
                 <Target size={14} />
              </div>
              <span className="font-black text-slate-800 text-sm tracking-tight">META GLOBAL</span>
            </>
          )}
        </div>
      )
    },
    {
      key: "targetAmount",
      label: "Alvo Previsto",
      sortable: true,
      render: (goal) => (
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-500" />
          <strong className="text-slate-800 font-black">{formatCurrency(goal.targetAmount)}</strong>
        </div>
      )
    },
    {
      key: "actions",
      label: "Gestão",
      align: "center",
      render: (goal) => (
        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={() => onEdit(goal)}
            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-accent hover:bg-white shadow-sm border border-transparent hover:border-slate-100 transition-all group/edit"
            title="Editar Meta"
          >
            <Edit2 size={16} className="group-hover/edit:scale-110 transition-transform" />
          </button>
          <button 
            onClick={() => onDelete?.(goal.id)}
            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-white shadow-sm border border-transparent hover:border-slate-100 transition-all group/del"
            title="Excluir"
          >
            <Trash2 size={16} className="group-hover/del:scale-110 transition-transform" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col">
      <div className="p-8 pb-6 flex items-center gap-3 border-b border-slate-100 bg-slate-50/10">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
             <Target size={20} />
          </div>
          <div>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Detalhamento de Objetivos</h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle de metas mensais</p>
          </div>
      </div>

      <SmartTable 
        data={goals} 
        columns={columns} 
        storageKey="admin_goals" 
      />
    </div>
  );
}
