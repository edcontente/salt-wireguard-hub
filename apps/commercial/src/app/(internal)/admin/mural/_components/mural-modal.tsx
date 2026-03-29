"use client";

import React, { useEffect, useState } from "react";
import { upsertAnnouncementAction } from "../../actions";
import { X, Megaphone, Type, FileText, CheckCircle2 } from "lucide-react";

type Announcement = {
  id?: string;
  title: string;
  content: string;
  type: string;
  active: boolean;
};

type MuralModalProps = {
  isOpen: boolean;
  onClose: () => void;
  item?: Announcement | null;
};

export function MuralModal({ isOpen, onClose, item }: MuralModalProps) {
  const [formData, setFormData] = useState<Announcement>({
    title: "",
    content: "",
    type: "INFO",
    active: true
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        title: "",
        content: "",
        type: "INFO",
        active: true
      });
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="catalog-modal-overlay">
      <div className="catalog-modal dash-card-glass !max-w-xl">
        <header className="catalog-modal__header p-8 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20">
                 <Megaphone size={24} />
              </div>
              <div>
                 <h3 className="font-black text-slate-800 text-xl tracking-tight">
                    {item ? "Editar Comunicado" : "Novo Comunicado"}
                 </h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure o aviso do mural</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white text-slate-400 transition-all border border-transparent hover:border-slate-100 hover:shadow-sm">
              <X size={20} />
           </button>
        </header>

        <form action={async (fd) => {
          if (item?.id) fd.append("id", item.id);
          fd.append("active", formData.active.toString());
          await upsertAnnouncementAction(fd);
          onClose();
        }} className="p-10 space-y-10">
           
           <div className="space-y-8">
              <div className="form-group-premium space-y-3">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Type size={14} className="text-accent" /> Título do Comunicado
                 </label>
                 <input 
                    name="title" 
                    className="form-input text-lg font-bold !py-4" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex.: Manutenção Programada" 
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="form-group-premium space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Megaphone size={14} className="text-accent" /> Categoria / Tipo
                    </label>
                    <select 
                       name="type" 
                       className="form-select font-bold" 
                       required
                       value={formData.type}
                       onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                       <option value="INFO">Informativo (Azul)</option>
                       <option value="WARNING">Alerta (Amarelo)</option>
                       <option value="URGENT">Urgente (Vermelho)</option>
                       <option value="SUCCESS">Sucesso (Verde)</option>
                    </select>
                 </div>

                 <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       Status de Exibição
                    </label>
                    <div className="mt-2 flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                       <div className="flex-1">
                          <p className="text-xs font-black text-slate-800">PUBLICAR AGORA</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aparecerá na Home imediatamente</p>
                       </div>
                       <label className="switch-container">
                          <input 
                             type="checkbox" 
                             checked={formData.active}
                             onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                          />
                          <span className="switch-slider"></span>
                       </label>
                    </div>
                 </div>
              </div>

              <div className="form-group-premium space-y-3">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-accent" /> Detalhamento da Mensagem
                 </label>
                 <textarea 
                    name="content" 
                    className="form-input min-h-[160px] !py-5 font-medium leading-relaxed" 
                    required 
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Descreva o comunicado em detalhes para toda a equipe..." 
                    style={{ resize: "none" }}
                 />
              </div>
           </div>

           <footer className="pt-8 flex justify-end gap-5 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-8 py-3.5 rounded-2xl text-sm font-black text-slate-400 hover:text-slate-800 transition-all">
                 Descartar
              </button>
              <button type="submit" className="btn-submit !py-3.5 !px-12 text-sm font-black shadow-2xl shadow-accent/20 flex items-center gap-3">
                 <CheckCircle2 size={18} /> {item ? "Salvar Alterações" : "Publicar no Mural"}
              </button>
           </footer>
        </form>
      </div>
    </div>
  );
}
