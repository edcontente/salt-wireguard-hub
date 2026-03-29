"use client";

import React, { useState } from "react";
import SmartTable, { ColumnConfig } from "@/components/smart-table";
import { UserModal } from "./user-modal";
import { deleteUserAction, toggleUserStatusAction } from "../../actions";
import { Edit2, Shield, Mail, Key, Trash2, Power } from "lucide-react";

type UserWithProfile = {
  id: string;
  name: string;
  email: string;
  status: string;
  profile: {
    id: string;
    name: string;
    slug: string;
  };
};

export function UserTable({ users, profiles }: { users: UserWithProfile[]; profiles: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);

  const columns: ColumnConfig<UserWithProfile>[] = [
    {
      key: "name",
      label: "Usuário",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 tracking-tight">{user.name}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} /> {user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: "profile",
      label: "Perfil / Acesso",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{user.profile.name}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (user) => (
        <span className={`badge-${user.status === "ACTIVE" ? "success" : "error"} flex items-center gap-1 w-fit`}>
          <Power size={12} />
          {user.status === "ACTIVE" ? "ATIVO" : "INATIVO"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Ações",
      align: "center",
      render: (user) => (
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => { setEditingUser(user); setIsModalOpen(true); }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-accent transition-all"
            title="Editar Usuário"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={async () => { if (confirm("Deseja alterar o status deste usuário?")) await toggleUserStatusAction(user.id, user.status); }}
            className={`p-2 rounded-lg hover:bg-slate-100 transition-all ${user.status === "ACTIVE" ? "text-emerald-400 hover:text-emerald-600" : "text-amber-400 hover:text-amber-600"}`}
            title="Ativar/Inativar"
          >
            <Power size={16} />
          </button>
          <button 
            onClick={async () => { if (confirm("Deseja apagar este usuário?")) await deleteUserAction(user.id); }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-all"
            title="Apagar Usuário"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
         <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <button className="px-4 py-2 text-xs font-bold bg-accent text-white rounded-lg shadow-md shadow-accent/20 transition-all">
               TODOS OS USUÁRIOS
            </button>
            <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all">
               ADMINISTRADORES
            </button>
         </div>
         
         <button 
           onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
           className="btn-submit !py-3 !px-6 text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-accent/40"
         >
           <Edit2 size={18} /> Novo Usuário
         </button>
      </div>

      <SmartTable 
        data={users} 
        columns={columns} 
        storageKey="admin_users" 
        emptyMessage="Nenhum usuário encontrado."
      />

      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={editingUser} 
        profiles={profiles}
      />
    </>
  );
}
