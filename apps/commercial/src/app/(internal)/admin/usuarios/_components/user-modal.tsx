"use client";

import React, { useEffect, useState } from "react";
import { upsertUserAction } from "../../actions";
import { X, User, Mail, Shield, Key, Eye, EyeOff } from "lucide-react";

type UserWithProfile = {
  id?: string;
  name: string;
  email: string;
  profileId: string;
  status: string;
};

type UserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user?: UserWithProfile | null;
  profiles: any[];
};

export function UserModal({ isOpen, onClose, user, profiles }: UserModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserWithProfile>({
    name: "",
    email: "",
    profileId: "",
    status: "ACTIVE"
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name,
        email: user.email,
        profileId: (user as any).profileId || (user as any).profile?.id || "",
        status: user.status
      });
    } else {
      setFormData({
        name: "",
        email: "",
        profileId: profiles[0]?.id || "",
        status: "ACTIVE"
      });
    }
  }, [user, isOpen, profiles]);

  if (!isOpen) return null;

  return (
    <div className="catalog-modal-overlay">
      <div className="catalog-modal dash-card-glass !max-w-xl">
        <header className="catalog-modal__header p-6 flex justify-between items-center border-b border-slate-100">
           <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                 <User size={20} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{user ? "Editar Usuário" : "Novo Usuário"}</h3>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
              <X size={20} />
           </button>
        </header>

        <form action={async (fd) => {
          await upsertUserAction(fd);
          onClose();
        }} className="p-8 space-y-6">
           {user?.id && <input type="hidden" name="id" value={user.id} />}
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group-premium space-y-2">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Nome Completo
                 </label>
                 <input 
                    name="name" 
                    className="form-input" 
                    required 
                    defaultValue={formData.name}
                    placeholder="Ex.: João Silva" 
                 />
              </div>

              <div className="form-group-premium space-y-2">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={12} /> Email de Acesso
                 </label>
                 <input 
                    name="email" 
                    type="email" 
                    className="form-input" 
                    required 
                    defaultValue={formData.email}
                    placeholder="joao@salt.com.br" 
                 />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group-premium space-y-2">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={12} /> Perfil de Acesso
                 </label>
                 <select 
                    name="profileId" 
                    className="form-select" 
                    required
                    defaultValue={formData.profileId}
                 >
                    {profiles.map(p => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                 </select>
              </div>

              <div className="form-group-premium space-y-2">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Key size={12} /> Senha {user && "(Deixe em branco para manter)"}
                 </label>
                 <div className="relative">
                    <input 
                       name="password" 
                       type={showPassword ? "text" : "password"} 
                       className="form-input pr-10" 
                       required={!user}
                       placeholder={user ? "••••••••" : "Mínimo 6 caracteres"} 
                    />
                    <button 
                       type="button" 
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                       {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                 </div>
              </div>
           </div>

           <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="icon-badge-accent p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                 <Shield size={16} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                 O perfil selecionado define as permissões de visualização e edição de propostas, catálogos e gestão de outros usuários.
              </p>
           </div>

           <footer className="pt-6 flex justify-end gap-4 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-200">
                 Cancelar
              </button>
              <button type="submit" className="btn-submit !py-2.5 !px-8 text-sm font-bold shadow-lg shadow-accent/20">
                 {user ? "Salvar Alterações" : "Criar Usuário"}
              </button>
           </footer>
        </form>
      </div>
    </div>
  );
}
