import React from "react";
import type { ReactNode } from "react";

const menuItems = [
  { label: "Catalogo", href: "/catalogo" },
  { label: "Propostas", href: "/propostas" }
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <p className="app-shell__eyebrow">Modulo</p>
        <h1 className="app-shell__title">Comercial</h1>
        <nav aria-label="Menu lateral" className="app-shell__nav">
          {menuItems.map((item) => (
            <a key={item.label} href={item.href} className="app-shell__link">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="app-shell__content">{children}</main>
    </div>
  );
}
