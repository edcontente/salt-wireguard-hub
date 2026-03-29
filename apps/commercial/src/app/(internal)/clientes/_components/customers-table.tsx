"use client";

import React, { useState } from "react";
import SmartTable, { ColumnConfig } from "@/components/smart-table";
import { deleteCustomerAction, bulkDeleteCustomersAction } from "../actions";
import { Edit2, Mail, Phone, Trash2, User, Building, ExternalLink } from "lucide-react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  type: string;
  active: boolean;
};

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const columns: ColumnConfig<Customer>[] = [
    {
      key: "name",
      label: "Cliente",
      sortable: true,
      alwaysVisible: true,
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm shadow-sm ring-4 ring-white border border-accent/20">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 tracking-tight">{customer.name}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
               {customer.type === "PF" ? <User size={10} /> : <Building size={10} />}
               {customer.document || "S/ Documento"}
            </div>
          </div>
        </div>
      )
    },
    {
      key: "contact",
      label: "Contato",
      render: (customer) => (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
            <Mail size={12} className="text-slate-400" /> {customer.email}
          </div>
          {customer.phone && (
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
              <Phone size={12} className="text-slate-400" /> {customer.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      alwaysVisible: true,
      render: (customer) => (
        <span className={`badge-${customer.active ? "success" : "error"} flex items-center gap-1 w-fit`}>
          {customer.active ? "ATIVO" : "INATIVO"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Gerenciar",
      align: "center",
      render: (customer) => (
        <div className="flex items-center justify-center gap-3">
          <Link 
            href={`/clientes/${customer.id}`} 
            className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-accent shadow-sm border border-transparent hover:border-slate-100 transition-all no-underline"
            title="Ver Detalhes"
          >
            <ExternalLink size={16} />
          </Link>
          <Link 
            href={`/clientes/cadastro?id=${customer.id}`} 
            className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-accent shadow-sm border border-transparent hover:border-slate-100 transition-all no-underline"
            title="Editar"
          >
            <Edit2 size={16} />
          </Link>
          <button 
            onClick={async () => { if (confirm("Apagar este cliente permanentemente?")) await deleteCustomerAction(customer.id); }}
            className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-red-500 shadow-sm border border-transparent hover:border-slate-100 transition-all"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <SmartTable 
      data={customers} 
      columns={columns} 
      storageKey="commercial_customers" 
      selectable
      onBulkDelete={bulkDeleteCustomersAction}
      emptyMessage="Sua base de clientes está vazia."
    />
  );
}
