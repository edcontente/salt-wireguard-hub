"use client";

import React from "react";
import SmartTable, { ColumnConfig } from "./smart-table";

type CatalogItem = {
  id: string;
  type: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  sku: string | null;
  referencePrice?: number;
  marginMultiplier?: number;
  active: boolean;
};

type CatalogTableProps = {
  items: CatalogItem[];
};

export function CatalogTable({ items }: CatalogTableProps) {
  const columns: ColumnConfig<CatalogItem>[] = [
    {
      key: "type",
      label: "Tipo",
      sortable: true,
      width: "120px",
      render: (item) => (
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100">
          {item.type === "PRODUCT" ? "PRODUTO" : item.type === "SERVICE" ? "SERVIÇO" : item.type === "RULE" ? "REGRA" : "MASTER"}
        </span>
      )
    },
    {
      key: "name",
      label: "Nome / Descrição",
      sortable: true,
      render: (item) => (
        <div className="font-black text-slate-800 tracking-tight text-sm">
          {item.name}
        </div>
      )
    },
    {
      key: "referencePrice",
      label: "Margem / Preço",
      sortable: true,
      render: (item) => (
        <div className="text-sm font-black text-accent tracking-tighter">
          {item.type === "RULE" && item.marginMultiplier 
            ? `${((item.marginMultiplier - 1) * 100).toFixed(0)}%` 
            : typeof item.referencePrice === 'number' 
              ? `R$ ${item.referencePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
              : "-"}
        </div>
      )
    },
    {
      key: "category",
      label: "Categoria",
      sortable: true,
      render: (item) => (
        <div className="text-xs font-bold text-slate-500 bg-slate-50/30 px-2 py-1 rounded-md w-fit">
          {item.category || "-"}
        </div>
      )
    },
    {
      key: "subcategory",
      label: "Subcategoria",
      sortable: true,
      render: (item) => (
        <div className="text-xs font-bold text-slate-400">
          {item.subcategory || "-"}
        </div>
      )
    },
    {
      key: "sku",
      label: "SKU / Código",
      sortable: true,
      render: (item) => (
        <div className="text-[10px] font-bold text-slate-400 font-mono italic">
          {item.sku || item.code || "N/A"}
        </div>
      )
    },
    {
      key: "active",
      label: "Status",
      sortable: true,
      render: (item) => (
        <span className={`badge-${item.active ? "success" : "error"} text-[9px] font-black`}>
          {item.active ? "ATIVO" : "INATIVO"}
        </span>
      )
    }
  ];

  return (
    <SmartTable 
      data={items} 
      columns={columns} 
      storageKey="commercial_catalog"
      emptyMessage="Nenhum item encontrado no catálogo."
    />
  );
}
