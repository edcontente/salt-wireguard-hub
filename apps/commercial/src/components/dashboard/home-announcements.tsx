"use client";

import React from "react";
import { Megaphone, Info, AlertTriangle, AlertCircle, CheckCircle2, Clock } from "lucide-react";
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

type Props = {
  announcements: Announcement[];
};

export function HomeAnnouncements({ announcements }: Props) {
  const getIcon = (type: string) => {
    switch (type) {
      case "INFO": return <Info size={18} className="text-blue-500" />;
      case "WARNING": return <AlertTriangle size={18} className="text-amber-500" />;
      case "URGENT": return <AlertCircle size={18} className="text-red-500" />;
      case "SUCCESS": return <CheckCircle2 size={18} className="text-emerald-500" />;
      default: return <Megaphone size={18} className="text-slate-400" />;
    }
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "INFO": return "bg-blue-50 text-blue-700 border-blue-100";
      case "WARNING": return "bg-amber-50 text-amber-700 border-amber-100";
      case "URGENT": return "bg-red-50 text-red-700 border-red-100";
      case "SUCCESS": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  if (announcements.length === 0) {
    return (
      <div className="dash-card-glass p-12 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
          <Megaphone size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-700">Mural Silencioso</h3>
          <p className="text-muted text-sm">Nenhum aviso importante no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Megaphone size={20} className="text-accent" /> Mural de Avisos
        </h2>
        <span className="text-xs font-bold text-muted bg-slate-100 px-2 py-1 rounded-full">
          {announcements.length} ATIVOS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map((item) => (
          <div key={item.id} className="dash-card-glass hover-scale group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${getBadgeClass(item.type).split(' ')[0]}`} />
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/50 shadow-sm border border-white/20">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-accent transition-colors leading-tight">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                {item.content}
              </p>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-auto pt-4 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {format(new Date(item.createdAt), "dd 'de' MMMM", { locale: ptBR })}
                </span>
                <span className={`px-2 py-0.5 rounded border ${getBadgeClass(item.type)}`}>
                  {item.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
