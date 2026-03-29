import React from "react";
import Link from "next/link";
import type { ReactNode } from "react";

import { 
  Home,
  BarChart3, 
  Package, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  LogOut,
  ShieldCheck,
  Briefcase,
  Box,
  Activity,
  DollarSign,
  ShoppingCart,
  Layers,
  Cpu,
  ChevronDown,
  Info,
  TrendingUp
} from "lucide-react";

const menuItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { 
    label: "Comercial", 
    icon: Briefcase, 
    expanded: true,
    children: [
      { label: "Propostas", href: "/propostas", icon: FileText },
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Sistemas", href: "/sistemas", icon: Cpu },
      { label: "Ambientes", href: "/ambientes", icon: Layers },
      { label: "Audit de Acessos", href: "/admin/acessos", icon: ShieldCheck, admin: true },
    ]
  },
  { 
    label: "Catálogo", 
    icon: Package, 
    expanded: true,
    children: [
      { label: "Produtos", href: "/produtos", icon: Box },
      { label: "Serviços", href: "/servicos", icon: Activity },
      { label: "Regras de Preço", href: "/regras-preco", icon: DollarSign },
      { label: "Compras", href: "/compras", icon: ShoppingCart },
    ]
  },
  { 
    label: "Administrativo", 
    icon: SettingsIcon, 
    expanded: true,
    admin: true,
    children: [
      { label: "Usuários", href: "/admin/usuarios", icon: Users },
      { label: "Mural", href: "/admin/mural", icon: Info },
      { label: "Metas", href: "/admin/metas", icon: TrendingUp },
    ]
  }
];

type AppShellProps = {
  children: ReactNode;
  user?: any;
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <aside className="app-sidebar">
        <Link href="/" className="app-sidebar__logo flex items-center gap-4 group p-8 mb-4 transition-all hover:bg-slate-50/50">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 bg-accent/10 rounded-2xl blur-xl group-hover:bg-accent/20 transition-all duration-700 scale-150"></div>
            <img src="/logo.png" alt="Salt Logo" className="relative w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="flex flex-col">
            <h1 className="logo-text text-2xl font-black text-slate-800 tracking-tighter leading-none">Salt</h1>
            <span className="text-[9px] font-black text-accent uppercase tracking-[0.2em] leading-none mt-1.5 opacity-80">Engenharia</span>
          </div>
        </Link>

        <nav aria-label="Menu lateral" className="flex-1 px-4 space-y-2 pb-8 overflow-y-auto thin-scrollbar">
          {menuItems.map((item) => {
            const isItemAdmin = item.admin;
            if (isItemAdmin && !user?.profile?.isSystem && !user?.canManageUsers) {
               return null;
            }

            return (
              <div key={item.label} className="space-y-1">
                {item.children ? (
                  <div className="space-y-1">
                    <div className="flex items-center px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 first:mt-0">
                      {item.label}
                    </div>
                    {item.children.map((child: any) => {
                      if (child.admin && !user?.profile?.isSystem && !user?.canManageUsers) {
                        return null;
                      }

                      return (
                        <Link 
                          key={child.label} 
                          href={child.href} 
                          className="app-sidebar__item group hover:bg-slate-50 transition-all duration-300"
                        >
                          <child.icon size={18} className="mr-3 transition-colors opacity-60 group-hover:opacity-100 group-hover:text-accent" />
                          <span className="group-hover:translate-x-1 transition-transform">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <Link 
                    href={item.href || "/"} 
                    className="app-sidebar__item group hover:bg-slate-50 transition-all duration-300"
                  >
                    <item.icon size={20} className="mr-3 transition-colors opacity-60 group-hover:opacity-100 group-hover:text-accent" />
                    <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {user && (
          <div className="p-6 mt-auto border-t border-slate-50">
            <div className="dash-card-glass p-5 !rounded-3xl shadow-xl shadow-slate-200/40 border-slate-100/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">OPERADOR SISTEMA</p>
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 border border-white">
                    {user.name.charAt(0)}
                 </div>
                 <p className="font-bold text-slate-700 truncate text-sm">{user.name}</p>
              </div>
              <form action="/api/logout" method="post">
                <button 
                  type="submit" 
                  className="flex items-center justify-center gap-2 text-[10px] font-black text-red-400 hover:text-red-600 transition-all w-full py-2.5 rounded-xl border border-transparent hover:border-red-50 hover:bg-red-50/30 uppercase tracking-widest"
                >
                  <LogOut size={12} /> Sair da conta
                </button>
              </form>
            </div>
          </div>
        )}
      </aside>
      
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50/50">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
