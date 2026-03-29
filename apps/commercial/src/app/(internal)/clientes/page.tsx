import React from "react";
import { PlusCircle, Users } from "lucide-react";
import { requireCommercialSession } from "@/lib/auth/session";
import { listCustomers } from "@/lib/customers/customer.service";
import { CustomersTable } from "./_components/customers-table";
import Link from "next/link";

export default async function CustomersPage() {
  const user = await requireCommercialSession();
  const customers = await listCustomers();

  return (
    <div className="customers-page-container p-8">
      <header className="page-header-premium mb-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="icon-badge-accent p-4 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20">
            <Users size={32} />
          </div>
          <div>
            <h1 className="section-title-premium text-3xl font-black text-slate-800 tracking-tight">Base de Clientes</h1>
            <p className="text-muted font-medium mt-1">Gerencie o relacionamento e histórico dos seus clientes Salt.</p>
          </div>
        </div>
        
        <Link href="/clientes/cadastro" className="btn-submit !py-3.5 !px-8 text-sm font-black flex items-center gap-3 shadow-xl hover:shadow-accent/40 rounded-[20px] no-underline">
           <PlusCircle size={20} /> Novo Cliente
        </Link>
      </header>

      <div className="dash-card-glass p-0 overflow-hidden shadow-xl border-slate-100">
        <CustomersTable customers={customers} />
      </div>
    </div>
  );
}
