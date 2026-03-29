"use client";

import React from "react";
import { CatalogTable } from "./catalog-table";
import { CatalogItemForm } from "./catalog-item-form";
import { 
  Search, 
  Plus, 
  Filter, 
  LayoutGrid, 
  List, 
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CatalogViewProps = {
  title: string;
  description: string;
  items: any[];
  canManage: boolean;
  createAction: any;
  defaultValues?: {
    type?: string;
    category?: string;
  };
};

export function CatalogView({
  title,
  description,
  items,
  canManage,
  createAction,
  defaultValues
}: CatalogViewProps) {
  return (
    <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER & ACTIONS */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">{title}</h1>
           <p className="text-slate-500 font-medium text-lg">{description}</p>
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

           {canManage && (
              <button className="flex items-center gap-2 px-6 py-3.5 bg-accent text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-xl shadow-blue-200 active:scale-95 ml-2">
                 <Plus size={18} /> Novo Item
              </button>
           )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
         {canManage && (
            <div className="dash-card-glass p-0 overflow-hidden border-2 border-dashed border-slate-100 bg-slate-50/20">
               <details className="group">
                  <summary className="list-none cursor-pointer p-6 flex items-center justify-between hover:bg-white/40 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                           <Plus size={20} />
                        </div>
                        <span className="font-black text-slate-700">Cadastrar Novo Registro</span>
                     </div>
                     <MoreVertical size={20} className="text-slate-300" />
                  </summary>
                  <div className="p-8 border-t border-slate-100 bg-white/40">
                     <CatalogItemForm 
                        action={createAction} 
                        canManageCatalog 
                        // Note: default values can be added to the form if needed
                     />
                  </div>
               </details>
            </div>
         )}

         <div className="dash-card-glass p-0 shadow-2xl shadow-slate-200/40 relative z-10">
            <CatalogTable items={items} />
         </div>
      </div>
    </div>
  );
}
