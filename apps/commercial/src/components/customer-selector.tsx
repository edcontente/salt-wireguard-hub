"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, User, Mail, Check, X, Loader2, Plus } from "lucide-react";
import { searchCustomersAction } from "@/app/(internal)/clientes/actions";
import Link from "next/link";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  document: string | null;
}

interface CustomerSelectorProps {
  onSelect: (customer: Customer | null) => void;
  defaultCustomer?: Customer | null;
}

export function CustomerSelector({ onSelect, defaultCustomer }: CustomerSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(defaultCustomer || null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchCustomersAction(query);
        setResults(data as Customer[]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    setSelected(customer);
    onSelect(customer);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    setSelected(null);
    onSelect(null);
    setQuery("");
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {selected ? (
        <div className="flex items-center justify-between p-4 rounded-2xl border border-accent bg-accent/5 transition-all animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20">
              <User size={20} />
            </div>
            <div>
              <div className="font-black text-slate-800 text-sm">{selected.name}</div>
              {selected.email && <div className="text-[11px] font-bold text-slate-400">{selected.email}</div>}
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleClear}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
          
          {/* Inputs ocultos para submissão de formulário padrão */}
          <input type="hidden" name="customerId" value={selected.id} />
          <input type="hidden" name="customerName" value={selected.name} />
          <input type="hidden" name="customerEmail" value={selected.email || ""} />
        </div>
      ) : (
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </div>
          <input
            type="text"
            className="form-input !pl-12 !py-4 !rounded-2xl border-slate-200 focus:border-accent shadow-sm font-bold text-sm"
            placeholder="Buscar cliente por nome, email ou CPF/CNPJ..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          
          {isOpen && (query.length >= 2 || results.length > 0) && (
            <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 size={24} className="mx-auto animate-spin mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Buscando Clientes...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-[320px] overflow-y-auto thin-scrollbar">
                  {results.map((c) => (
                    <div 
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="p-4 cursor-pointer border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-all group/item"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center group-hover/item:bg-accent group-hover/item:text-white transition-all">
                          <User size={16} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                          <div className="flex gap-3 text-[10px] font-bold text-slate-400">
                            {c.document && <span>{c.document}</span>}
                            {c.email && <span className="flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                          </div>
                        </div>
                      </div>
                      <Check size={16} className="text-accent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              ) : query.length >= 2 ? (
                <div className="p-8 text-center bg-slate-50/50">
                  <div className="text-slate-400 mb-4 text-xs font-bold italic">Nenhum cliente encontrado com este nome.</div>
                  <Link 
                    href="/clientes/novo" 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:text-accent hover:border-accent transition-all shadow-sm"
                  >
                    <Plus size={14} /> CADASTRAR NOVO CLIENTE
                  </Link>
                </div>
              ) : null}
              
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
                 <Search size={10} className="text-slate-300" />
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Pressione ESC para fechar</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
