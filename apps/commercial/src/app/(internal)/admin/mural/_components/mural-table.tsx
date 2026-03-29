"use client";

import React, { useState } from "react";
import SmartTable, { ColumnConfig } from "@/components/smart-table";
import { MuralModal } from "./mural-modal";
import { deleteAnnouncementAction } from "../../actions";
import { Edit2, Megaphone, Trash2, Power, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  active: boolean;
  createdAt: Date;
};

export function MuralTable({ announcements }: { announcements: Announcement[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  const columns: ColumnConfig<Announcement>[] = [
    {
      key: "title",
      label: "Comunicado",
      sortable: true,
      render: (item) => (
        <div className="flex items-start gap-4 p-2">
          <div className={`p-2 rounded-xl border ${getTypeStyles(item.type).badge}`}>
            <Megaphone size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 leading-tight mb-1">{item.title}</h3>
            <p className="text-xs text-slate-400 line-clamp-1">{item.content}</p>
          </div>
        </div>
      )
    },
    {
      key: "type",
      label: "Tipo / Gravidade",
      sortable: true,
      render: (item) => (
        <span className={`badge-pill flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getTypeStyles(item.type).badge}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${getTypeStyles(item.type).dot}`} />
          {item.type}
        </span>
      )
    },
    {
      key: "active",
      label: "Exibição",
      sortable: true,
      render: (item) => (
        <span className={`badge-${item.active ? "success" : "error"} flex items-center gap-1 w-fit`}>
          <Power size={12} />
          {item.active ? "NO MURAL" : "OCULTO"}
        </span>
      )
    },
    {
      key: "createdAt",
      label: "Publicado em",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Clock size={12} />
          {format(new Date(item.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
        </div>
      )
    },
    {
      key: "actions",
      label: "Ações",
      align: "center",
      render: (item) => (
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-accent transition-all"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={async () => { if (confirm("Apagar este comunicado permanentemente?")) await deleteAnnouncementAction(item.id); }}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
         <div className="flex items-center gap-3 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm pr-4">
            <div className="p-2 bg-slate-800 text-white rounded-xl">
               <Info size={18} />
            </div>
            <p className="text-xs font-bold text-slate-600">Total de {announcements.length} comunicados registrados</p>
         </div>
         
         <button 
           onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
           className="btn-submit !py-3.5 !px-8 text-sm font-bold flex items-center gap-2 shadow-xl hover:shadow-accent/40"
         >
           <Megaphone size={20} /> Novo Comunicado
         </button>
      </div>

      <SmartTable 
        data={announcements} 
        columns={columns} 
        storageKey="admin_mural" 
      />

      <MuralModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        item={editingItem} 
      />
    </>
  );
}

function getTypeStyles(type: string) {
  switch (type) {
    case "INFO": return { badge: "bg-blue-50 text-blue-600 border-blue-100", dot: "bg-blue-600" };
    case "WARNING": return { badge: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-600" };
    case "URGENT": return { badge: "bg-red-50 text-red-600 border-red-100", dot: "bg-red-600" };
    case "SUCCESS": return { badge: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-600" };
    default: return { badge: "bg-slate-50 text-slate-600 border-slate-100", dot: "bg-slate-600" };
  }
}
