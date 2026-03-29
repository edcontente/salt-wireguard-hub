"use client";

import React from "react";
import type {
  ProposalCatalogOption,
  ProposalEditorSectionViewModel,
  ProposalFormAction
} from "@/lib/proposals/proposal-editor.types";
import { ProposalItemsTable } from "./proposal-items-table";
import { 
  Box, 
  Trash2, 
  Edit3, 
  MoreVertical,
  Layers
} from "lucide-react";

type ProposalSectionEditorProps = {
  section: ProposalEditorSectionViewModel;
  catalogItems: ProposalCatalogOption[];
  globalEnvironments?: { id: string; name: string }[];
  addItemAction: ProposalFormAction;
  editable: boolean;
  maxFinalPriceAdjustment: number;
};

export function ProposalSectionEditor({
  section,
  catalogItems,
  globalEnvironments = [],
  addItemAction,
  editable,
  maxFinalPriceAdjustment
}: ProposalSectionEditorProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* SECTION HEADER */}
      <header className="dash-card-glass p-8 flex items-center justify-between border-l-4 border-l-accent shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center p-2 shadow-sm">
              <Layers size={28} />
           </div>
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{section.title}</h3>
                  <select 
                    className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-50 text-accent uppercase tracking-widest border border-blue-100 outline-none cursor-pointer"
                    defaultValue={section.title}
                  >
                    <option value="" disabled>Vincular Ambiente...</option>
                    {globalEnvironments.map(env => (
                      <option key={env.id} value={env.name}>{env.name}</option>
                    ))}
                  </select>
               </div>
               <p className="text-sm font-medium text-slate-500 max-w-md line-clamp-2">
                 {section.description || "Gerencie os itens técnicos e comerciais vinculados a este sistema."}
               </p>
            </div>
        </div>

        <div className="flex items-center gap-2">
           <button className="p-3 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100">
              <Edit3 size={18} />
           </button>
           <button className="p-3 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all border border-transparent hover:border-red-100">
              <Trash2 size={18} />
           </button>
           <div className="w-px h-6 bg-slate-100 mx-1" />
           <button className="p-3 rounded-xl hover:bg-slate-50 text-slate-400 transition-all">
              <MoreVertical size={18} />
           </button>
        </div>
      </header>

      {/* ITEMS TABLE */}
      <div className="dash-card-glass p-0 overflow-hidden shadow-xl shadow-slate-200/50">
        <ProposalItemsTable
          sectionId={section.id}
          items={section.items}
          catalogItems={catalogItems}
          addItemAction={addItemAction}
          editable={editable}
          maxFinalPriceAdjustment={maxFinalPriceAdjustment}
        />
      </div>
    </div>
  );
}
