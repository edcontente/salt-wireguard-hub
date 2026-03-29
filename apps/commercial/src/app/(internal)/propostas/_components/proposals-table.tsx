"use client";

import React from "react";
import SmartTable, { ColumnConfig } from "@/components/smart-table";
import { ProposalStatusBadge } from "@/components/proposal-status-badge";
import { Edit2, Eye, FileText, User, Calendar, DollarSign, ChevronRight } from "lucide-react";
import Link from "next/link";

type ProposalSummary = {
  id: string;
  number: string;
  versionLabel: string;
  customerName: string;
  title: string;
  status: string;
  total: number;
};

export function ProposalsTable({ proposals }: { proposals: ProposalSummary[] }) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const columns: ColumnConfig<ProposalSummary>[] = [
    {
      key: "number",
      label: "Identificação",
      sortable: true,
      alwaysVisible: true,
      render: (p) => (
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
             <FileText size={18} />
          </div>
          <div>
            <div className="font-black text-slate-800 tracking-tight">#{p.number}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.versionLabel}</div>
          </div>
        </div>
      )
    },
    {
      key: "customerName",
      label: "Cliente / Projeto",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-0.5">
          <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <User size={12} className="text-slate-300" /> {p.customerName}
          </div>
          <div className="text-xs text-slate-400 font-medium line-clamp-1">{p.title}</div>
        </div>
      )
    },
    {
      key: "status",
      label: "Situação",
      sortable: true,
      render: (p) => <ProposalStatusBadge status={p.status as any} />
    },
    {
      key: "total",
      label: "Valor Total",
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <DollarSign size={14} className="text-emerald-500" />
          <strong className="text-slate-800 font-black">{formatCurrency(p.total)}</strong>
        </div>
      )
    },
    {
      key: "actions",
      label: "Gerenciar",
      align: "center",
      render: (p) => (
        <div className="flex items-center justify-center gap-3">
          <Link 
            href={`/propostas/${p.id}`} 
            className="p-2.5 rounded-xl hover:bg-white text-slate-400 hover:text-accent shadow-sm border border-transparent hover:border-slate-100 transition-all no-underline"
            title="Editar Proposta"
          >
            <Edit2 size={16} />
          </Link>
          <Link 
            href={`/propostas/${p.id}/visualizacao`} 
            className="p-2.5 rounded-xl hover:bg-white text-slate-400 hover:text-blue-500 shadow-sm border border-transparent hover:border-slate-100 transition-all no-underline"
            title="Ver Prévia"
          >
            <Eye size={16} />
          </Link>
          <button className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-300">
            <ChevronRight size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <SmartTable 
      data={proposals} 
      columns={columns} 
      storageKey="commercial_proposals" 
      emptyMessage="Nenhuma proposta disponível para exibição."
    />
  );
}
