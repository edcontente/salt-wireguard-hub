"use client";

import React from "react";
import type {
  ProposalCatalogOption,
  ProposalEditorItemViewModel,
  ProposalFormAction
} from "@/lib/proposals/proposal-editor.types";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Package, 
  Activity, 
  DollarSign, 
  CornerDownRight,
  TrendingDown,
  Info
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatItemType(type: ProposalEditorItemViewModel["type"]) {
  if (type === "PRODUCT") return "Produto";
  if (type === "SERVICE") return "Serviço";
  return "Manual";
}

type ProposalItemsTableProps = {
  sectionId: string;
  items: ProposalEditorItemViewModel[];
  catalogItems: ProposalCatalogOption[];
  addItemAction: ProposalFormAction;
  editable: boolean;
  maxFinalPriceAdjustment: number;
};

export function ProposalItemsTable({
  sectionId,
  items,
  catalogItems,
  addItemAction,
  editable,
  maxFinalPriceAdjustment
}: ProposalItemsTableProps) {
  return (
    <div className="flex flex-col">
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Tipo</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item / Descrição</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Qtd</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-44">Valor Unitário</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/40">
              {items.map((item) => (
                <tr key={item.id} className="group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                  <td className="px-8 py-6">
                     <span className={cn(
                       "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border",
                       item.type === "PRODUCT" ? "bg-blue-50 text-accent border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                     )}>
                        {formatItemType(item.type)}
                     </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center p-2 group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                            {item.type === "PRODUCT" ? <Package size={14} /> : <Activity size={14} />}
                         </div>
                         <strong className="text-slate-800 font-extrabold text-base tracking-tight">{item.name}</strong>
                      </div>
                      {item.description && (
                        <div className="flex items-start gap-1 text-xs text-slate-400 font-medium pl-10">
                          <CornerDownRight size={12} className="mt-0.5 shrink-0" />
                          <p className="line-clamp-1">{item.description}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="font-black text-slate-700">{item.quantity}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                       <strong className="text-slate-800 font-black text-base">{formatCurrency(item.unitPrice)}</strong>
                       {item.discountPercent > 0 && (
                         <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 group-hover:animate-pulse">
                            <TrendingDown size={10} /> -{item.discountPercent}% DESCONTO
                         </span>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-2 rounded-xl text-slate-300 hover:bg-slate-50 hover:text-accent border border-transparent hover:border-slate-100 transition-all">
                          <Edit3 size={16} />
                       </button>
                       <button className="p-2 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100 transition-all">
                          <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white/40">
           <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-200 flex items-center justify-center mb-6 border border-slate-100">
              <Plus size={32} />
           </div>
           <p className="text-slate-400 font-bold mb-1">Nenhum item neste ambiente ainda.</p>
           <p className="text-xs text-slate-300 font-medium">Use o formulário abaixo para adicionar itens do catálogo.</p>
        </div>
      )}

      {/* ADD ITEM FORM (INTEGRATED) */}
      <div className="bg-slate-50/50 border-t border-slate-100 p-8">
        <form action={addItemAction}>
          <fieldset disabled={!editable} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 items-end">
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Item do Catálogo</label>
              <select 
                name="commercialItemId" 
                defaultValue="" 
                required
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-accent/10 transition-all outline-none appearance-none"
              >
                <option disabled value="">Selecione um item...</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({formatItemType(item.type)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quantidade</label>
              <input
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue="1"
                required
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-accent/10 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Vlr Unitário</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  name="unitPrice" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="Referência"
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-5 py-3.5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-accent/10 transition-all outline-none"
                />
              </div>
            </div>

            <div className="col-span-1 lg:col-span-2">
               <button 
                  type="submit"
                  className={cn(
                    "w-full h-[54px] flex items-center justify-center gap-2 bg-accent text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
                  )}
               >
                  <Plus size={18} /> Adicionar ao Ambiente
               </button>
            </div>
          </fieldset>
        </form>
        
        <div className="mt-6 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Info size={14} className="text-yellow-500" />
              Sua alçada permite até <strong className="text-slate-600">{maxFinalPriceAdjustment}%</strong> de ajuste.
           </div>
           
           {!editable && (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500 italic">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                 Versão congelada. Crie uma revisão para editar.
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
