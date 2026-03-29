"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FileText, 
  Briefcase, 
  ShoppingCart, 
  Box, 
  Layers, 
  Settings,
  Component,
  Tag,
  PlusCircle,
  List,
  LogOut,
  User as UserIcon,
  DollarSign,
  Home,
  LayoutDashboard,
  Shield
} from "lucide-react";

type NavNode = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavNode[];
  defaultOpen?: boolean;
};

const navigationTree: NavNode[] = [
  {
    label: "Home",
    href: "/",
    icon: <Home size={18} />
  },
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard size={18} />
  },
  {
    label: "Operacional",
    icon: <Settings size={18} />,
    children: [
      { label: "Visão Geral", href: "#" }
    ]
  },
  {
    label: "Comercial",
    icon: <Briefcase size={18} />,
    defaultOpen: true,
    children: [
      { label: "Propostas", href: "/propostas", icon: <FileText size={16} /> },
      { label: "Clientes", href: "/clientes", icon: <UserIcon size={16} /> },
      { label: "Sistemas", href: "/catalogo/sistemas", icon: <Component size={16} /> },
      { label: "Ambientes", href: "/catalogo/ambientes", icon: <Layers size={16} /> },
      {
        label: "Catálogo",
        icon: <Folder size={16} />,
        defaultOpen: true,
        children: [
          {
            label: "Produtos",
            icon: <Box size={16} />,
            children: [
              { label: "Lista de Produtos", href: "/catalogo/produtos", icon: <List size={14} /> },
              { label: "Marcas", href: "/catalogo/marcas" },
              { label: "Categorias", href: "/catalogo/categorias" },
              { label: "Subcategorias", href: "/catalogo/subcategorias" },
              { label: "Cadastrar Produtos", href: "/catalogo/produtos/cadastro", icon: <PlusCircle size={14} /> },
            ]
          },
          {
            label: "Serviços",
            icon: <Tag size={16} />,
            children: [
              { label: "Lista de Serviços", href: "/catalogo/servicos", icon: <List size={14} /> },
              { label: "Categorias", href: "/catalogo/categorias" },
              { label: "Cadastrar Serviços", href: "/catalogo/servicos/cadastro", icon: <PlusCircle size={14} /> },
            ]
          }
        ]
      },
      { label: "Regras de Preço", href: "/regras-de-preco", icon: <DollarSign size={16} /> }
    ]
  },
  {
    label: "Compras",
    icon: <ShoppingCart size={18} />,
    children: [
      { label: "Pedidos", href: "#" }
    ]
  },
  {
    label: "Administrativo",
    icon: <Shield size={18} />,
    children: [
      { label: "Usuários", href: "/admin/usuarios", icon: <UserIcon size={16} /> },
      { label: "Mural (Home)", href: "/admin/mural", icon: <LayoutDashboard size={16} /> },
      { label: "Metas de Vendas", href: "/admin/metas", icon: <DollarSign size={16} /> },
      { label: "Acessos Externos", href: "/admin/acessos", icon: <Shield size={16} /> }
    ]
  }
];

function NavItem({ item, level = 0, pathname }: { item: NavNode; level?: number; pathname: string }) {
  const [isOpen, setIsOpen] = useState(item.defaultOpen || false);
  const hasChildren = item.children && item.children.length > 0;
  
  const isActive = item.href && item.href !== "#" && pathname.startsWith(item.href);

  const handlePlaceholderClick = (e: React.MouseEvent) => {
    if (item.href === "#") {
      e.preventDefault();
      alert(`A tela "${item.label}" ainda não foi implementada (Placeholder).`);
    }
  };

  const content = (
    <div 
      className={`app-sidebar__item level-${level} ${isActive ? "app-sidebar__item--active" : ""}`}
      style={{ paddingLeft: `${level * 16 + 16}px` }}
      onClick={() => hasChildren && setIsOpen(!isOpen)}
    >
      <div className="app-sidebar__item-content">
        {item.icon && <span className="app-sidebar__icon">{item.icon}</span>}
        <span className="app-sidebar__label">{item.label}</span>
      </div>
      {hasChildren && (
        <span className="app-sidebar__chevron">
          {isOpen ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
        </span>
      )}
    </div>
  );

  return (
    <div className="app-sidebar__node">
      {item.href && item.href !== "#" ? (
        <Link 
          href={item.href} 
          className="app-sidebar__link-wrapper"
          onClick={handlePlaceholderClick}
        >
          {content}
        </Link>
      ) : (
        <div 
          className={hasChildren ? "app-sidebar__actionable" : "app-sidebar__non-actionable"}
          onClick={handlePlaceholderClick}
        >
          {content}
        </div>
      )}
      
      {hasChildren && isOpen && (
        <div className="app-sidebar__children">
          {item.children!.map((child, idx) => (
            <NavItem key={idx} item={child} level={level + 1} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebar({ 
  user, 
  isCollapsed = false, 
  toggleSidebar 
}: { 
  user: { name: string; canManageUsers?: boolean };
  isCollapsed?: boolean;
  toggleSidebar?: () => void;
}) {
  const pathname = usePathname() || "";
  
  // Filtrar o menu administrativo se o usuário não tiver permissão
  const visibleTree = navigationTree.filter(item => {
    if (item.label === "Administrativo") {
      return !!user.canManageUsers;
    }
    return true;
  });
  
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__header px-6 py-8 border-b border-slate-50 mb-6">
        <Link href="/" className="app-sidebar__logo flex items-center gap-3 group">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-accent/10 rounded-xl blur-lg group-hover:bg-accent/20 transition-all duration-500"></div>
            <img src="/logo.png" alt="Salt Logo" className="relative w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="flex flex-col">
            <h1 className="logo-text text-xl font-black text-slate-800 tracking-tighter leading-none">Salt</h1>
            <span className="text-[8px] font-black text-accent uppercase tracking-widest leading-none mt-1">Engenharia</span>
          </div>
        </Link>
        {toggleSidebar && (
          <button 
            className="sidebar-toggle-btn" 
            onClick={toggleSidebar}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronRight size={16} style={{ 
              transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }} />
          </button>
        )}
      </div>
      <div className="app-sidebar__scroll-area">
        <nav aria-label="Menu lateral principal" className="app-sidebar__nav">
          {visibleTree.map((item, idx) => (
            <NavItem key={idx} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>
      <div className="app-sidebar__footer">
        <div className="user-profile">
          <div className="user-profile__avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-profile__info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.canManageUsers ? "Administrador" : "Comercial"}</span>
          </div>
        </div>
        <form action="/api/logout" method="post" style={{ width: "100%" }}>
          <button type="submit" className="btn-logout" title="Sair do sistema">
            <LogOut size={16} /> <span>Sair da conta</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
