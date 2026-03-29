"use client";

import React from "react";
import SmartTable, { ColumnConfig } from "@/components/smart-table";
import { Plus, LayoutGrid, List, RefreshCw, Settings, User } from "lucide-react";
import { CommercialSessionUser } from "@/lib/auth/session";

type EnvironmentsViewProps = {
  user: CommercialSessionUser & { profileSlug: string };
  standardEnvs: any[];
  personalizedEnvs: any[];
};

export default function EnvironmentsView({ user, standardEnvs, personalizedEnvs }: EnvironmentsViewProps) {
  const columns: ColumnConfig<any>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      width: "150px",
      render: (item) => (
        <span className="text-[10px] font-bold text-slate-400 font-mono italic">
          {item.id}
        </span>
      )
    },
    {
      key: "name",
      label: "Nome do Ambiente",
      sortable: true,
      alwaysVisible: true,
      render: (item) => (
        <div className="font-black text-slate-800 tracking-tight text-sm uppercase">
          {item.name}
        </div>
      )
    },
    {
      key: "isDefault",
      label: "Tipo",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.isDefault ? (
            <span className="text-[9px] font-black text-accent uppercase tracking-widest bg-accent/10 px-2.5 py-1.5 rounded-lg border border-accent/20 flex items-center gap-1.5">
              <Settings size={10} /> MASTER
            </span>
          ) : (
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
              <User size={10} /> PERSONALIZADO
            </span>
          )}
        </div>
      )
    },
    {
      key: "createdAt",
      label: "Criado em",
      sortable: true,
      render: (item) => (
        <div className="text-xs font-bold text-slate-400">
          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </div>
      )
    }
  ];

  return (
    <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Ambientes</h1>
           <p className="text-slate-500 font-medium text-lg">Gerenciamento de locais e ambientes para aplicação de itens.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex bg-white rounded-2xl p-1 border border-slate-100 shadow-sm">
              <button className="p-2 rounded-xl bg-slate-50 text-accent outline-none">
                 <LayoutGrid size={20} />
              </button>
              <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-all outline-none">
                 <List size={20} />
              </button>
           </div>
           
           <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all active:scale-95">
              <RefreshCw size={20} />
           </button>

           {(user.canManageUsers || user.profileSlug === "admin") && (
              <button className="flex items-center gap-2 px-6 py-3.5 bg-accent text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-xl shadow-blue-200 active:scale-95 ml-2">
                 <Plus size={18} /> Novo Ambiente
              </button>
           )}
        </div>
      </header>

      {/* STANDARD ENVIRONMENTS SECTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Ambientes Padrão (Master)</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modelos globais reutilizáveis em qualquer proposta</p>
          </div>
        </div>
        
        <div className="dash-card-glass p-0 shadow-2xl shadow-slate-200/40 relative z-20">
          <SmartTable 
            data={standardEnvs} 
            columns={columns} 
            storageKey="env_standard"
            emptyMessage="Nenhum ambiente padrão encontrado."
          />
        </div>
      </section>

      {/* PERSONALIZED ENVIRONMENTS SECTION */}
      <section className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Ambientes Personalizados</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Registros criados dinamicamente ou personalizados</p>
          </div>
        </div>
        
        <div className="dash-card-glass p-0 shadow-2xl shadow-slate-200/40 relative z-10">
          <SmartTable 
            data={personalizedEnvs} 
            columns={columns} 
            storageKey="env_personalized"
            emptyMessage="Nenhum ambiente personalizado encontrado."
            selectable
          />
        </div>
      </section>
    </div>
  );
}
