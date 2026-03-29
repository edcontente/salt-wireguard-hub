"use client";

import React, { useState, useMemo } from "react";
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  MoreHorizontal, 
  Trash2, 
  Download,
  Filter,
  CheckSquare,
  Square,
  LayoutGrid,
  RotateCcw,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
import { useEffect } from "react";

export type ColumnConfig<T> = {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  alwaysVisible?: boolean;
};

type SmartTableProps<T> = {
  data: T[];
  columns: ColumnConfig<T>[];
  storageKey?: string;
  defaultSortKey?: keyof T;
  defaultSortDir?: "asc" | "desc";
  selectable?: boolean;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  emptyMessage?: string;
};

export default function SmartTable<T extends { id: string }>({
  data,
  columns,
  storageKey,
  defaultSortKey,
  defaultSortDir = "asc",
  selectable = false,
  onBulkDelete,
  emptyMessage = "Nenhum dado encontrado."
}: SmartTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set(columns.map(c => String(c.key))));
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Persistence: Load from localStorage
  useEffect(() => {
    if (!storageKey) {
      setSortKey((defaultSortKey as any) || null);
      setSortDir(defaultSortDir);
      setVisibleKeys(new Set(columns.map(c => String(c.key))));
      return;
    }

    const savedSortKey = localStorage.getItem(`${storageKey}_sortKey`);
    const savedSortDir = localStorage.getItem(`${storageKey}_sortDir`);
    const savedVisibleKeys = localStorage.getItem(`${storageKey}_columns`);

    if (savedSortKey) setSortKey(savedSortKey as any);
    else setSortKey((defaultSortKey as any) || null);

    if (savedSortDir) setSortDir(savedSortDir as ("asc" | "desc"));
    
    if (savedVisibleKeys) {
      try {
        setVisibleKeys(new Set(JSON.parse(savedVisibleKeys)));
      } catch {
        setVisibleKeys(new Set(columns.map(c => String(c.key))));
      }
    } else {
      setVisibleKeys(new Set(columns.map(c => String(c.key))));
    }
  }, [storageKey]);

  // Persistence: Save to localStorage
  useEffect(() => {
    if (!storageKey) return;
    if (sortKey) localStorage.setItem(`${storageKey}_sortKey`, String(sortKey));
    localStorage.setItem(`${storageKey}_sortDir`, sortDir);
    localStorage.setItem(`${storageKey}_columns`, JSON.stringify(Array.from(visibleKeys)));
  }, [sortKey, sortDir, visibleKeys, storageKey]);

  const toggleColumn = (key: string) => {
    const next = new Set(visibleKeys);
    if (next.has(key)) {
      // Don't remove if it's the only one left or if it's alwaysVisible
      const col = columns.find(c => String(c.key) === key);
      if (next.size > 1 && !col?.alwaysVisible) {
        next.delete(key);
      }
    } else {
      next.add(key);
    }
    setVisibleKeys(next);
  };

  const resetColumns = () => {
    setVisibleKeys(new Set(columns.map(c => String(c.key))));
  };

  // Filtragem
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => {
      return Object.values(item).some(val => 
        String(val).toLowerCase().includes(lowerSearch)
      );
    });
  }, [data, searchTerm]);

  // Ordenação
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (aVal === bVal) return 0;
      
      const comparison = String(aVal) < String(bVal) ? -1 : 1;
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDir]);

  const toggleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedData.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.size === 0) return;
    if (confirm(`Deseja apagar ${selectedIds.size} itens selecionados?`)) {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleExport = () => {
    const exportData = sortedData.map(item => {
      const row: any = {};
      columns.forEach(col => {
        if (col.key !== "actions" && visibleKeys.has(String(col.key))) {
          row[col.label] = item[col.key as keyof T];
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    const fileName = `${storageKey || "export"}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const activeColumns = columns.filter(col => visibleKeys.has(String(col.key)));

  return (
    <div className="smart-table-wrapper w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4 border-b border-slate-100 bg-white/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar em toda a tabela..." 
            className="form-input !pl-12 !py-3 !rounded-2xl shadow-sm border-slate-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && onBulkDelete && (
             <div className="bulk-actions-bar animate-in fade-in slide-in-from-right-4 bg-red-50 border border-red-100 p-1.5 rounded-2xl flex items-center gap-4 pr-4 shadow-sm">
                <span className="text-[10px] font-black text-red-600 px-3 py-2 bg-red-100/50 rounded-xl leading-none">
                   {selectedIds.size} SELECIONADOS
                </span>
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 text-xs font-black text-red-600 hover:bg-red-200/50 p-2 rounded-xl transition-all"
                >
                  <Trash2 size={16} /> APAGAR SELEÇÃO
                </button>
             </div>
          )}

          <div className="relative group">
            <button 
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className={`p-3 rounded-2xl border ${showColumnPicker ? "border-accent text-accent bg-accent/5" : "border-slate-200 text-slate-400"} hover:text-accent hover:border-accent transition-all bg-white shadow-sm flex items-center gap-2`}
              title="Gerenciar Colunas"
            >
              <LayoutGrid size={18} />
              <span className="text-xs font-bold hidden md:inline">Colunas</span>
            </button>

            {showColumnPicker && (
               <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-5 z-50 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Visibilidade</span>
                     <div className="flex items-center gap-2">
                        <button onClick={resetColumns} className="p-1.5 text-slate-300 hover:text-accent transition-colors" title="Limpar">
                           <RotateCcw size={14} />
                        </button>
                        <button onClick={() => setShowColumnPicker(false)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                           <X size={14} />
                        </button>
                     </div>
                  </div>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 thin-scrollbar">
                     {columns.map(col => {
                        const isVisible = visibleKeys.has(String(col.key));
                        const isAction = col.key === "actions";
                        if (isAction) return null;

                        return (
                           <button 
                             key={String(col.key)}
                             onClick={() => toggleColumn(String(col.key))}
                             className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${isVisible ? "bg-accent/5 text-accent shadow-sm border border-accent/5" : "text-slate-400 hover:bg-slate-50"}`}
                           >
                              <span className="text-xs font-bold">{col.label}</span>
                              {isVisible ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} className="text-slate-200" />}
                           </button>
                        );
                     })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                     <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Personalize seu ERP</p>
                  </div>
               </div>
            )}
          </div>

          <button 
            onClick={handleExport}
            className="p-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-accent hover:border-accent transition-all bg-white shadow-sm flex items-center gap-2 group"
            title="Exportar para Excel"
          >
            <Download size={18} />
            <span className="hidden group-hover:block text-xs font-bold transition-all">Exportar</span>
          </button>
          
          <button className="p-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all bg-white shadow-sm">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {selectable && (
                <th className="p-4 w-12 sticky left-0 z-20 bg-slate-50">
                  <button 
                    onClick={toggleSelectAll} 
                    className={`p-1 rounded-lg transition-colors ${selectedIds.size === sortedData.length && sortedData.length > 0 ? "text-accent" : "text-slate-300"}`}
                  >
                    {selectedIds.size === sortedData.length && sortedData.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </th>
              )}
              {activeColumns.map((col) => (
                <th 
                  key={String(col.key)} 
                  className={`p-5 text-xs font-black text-slate-400 uppercase tracking-widest ${col.width ? "" : "flex-1"}`}
                  style={{ width: col.width, textAlign: col.align || "left" }}
                >
                  {col.sortable && col.key !== "actions" ? (
                    <button 
                      onClick={() => toggleSort(col.key as keyof T)}
                      className="flex items-center gap-1.5 hover:text-slate-800 transition-colors group"
                    >
                      {col.label}
                      <div className="flex flex-col text-[8px] opacity-40 group-hover:opacity-100">
                        <ChevronUp size={8} className={sortKey === col.key && sortDir === "asc" ? "text-accent" : ""} />
                        <ChevronDown size={8} className={sortKey === col.key && sortDir === "desc" ? "text-accent" : ""} />
                      </div>
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.length > 0 ? (
              sortedData.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  {selectable && (
                    <td className="p-4 sticky left-0 z-10 bg-white group-hover:bg-transparent">
                       <button 
                         onClick={() => toggleSelectItem(item.id)} 
                         className={`p-1 rounded-lg transition-colors ${selectedIds.has(item.id) ? "text-accent" : "text-slate-200 group-hover:text-slate-300"}`}
                       >
                         {selectedIds.has(item.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                       </button>
                    </td>
                  )}
                  {activeColumns.map((col) => (
                    <td 
                      key={String(col.key)} 
                      className={`p-5 text-sm text-slate-600 font-medium ${col.key === "actions" ? "bg-slate-50/30 backdrop-blur-sm" : ""}`}
                      style={{ textAlign: col.align || "left" }}
                    >
                      {col.render ? col.render(item) : (item[col.key as keyof T] as any)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={activeColumns.length + (selectable ? 1 : 0)} className="p-20 text-center">
                   <div className="flex flex-col items-center gap-4 text-slate-300">
                      <div className="p-4 rounded-3xl bg-slate-50">
                         <Search size={48} />
                      </div>
                      <p className="font-bold text-slate-400">{emptyMessage}</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
