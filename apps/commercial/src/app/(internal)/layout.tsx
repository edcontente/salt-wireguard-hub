import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireCommercialSession } from "@/lib/auth/session";

type InternalLayoutProps = {
  children: ReactNode;
};

export default async function InternalLayout({ children }: InternalLayoutProps) {
  const user = await requireCommercialSession();

  return (
    <AppShell>
      <header>
        <p>{user.name}</p>
        <form action="/api/logout" method="post">
          <button type="submit">Sair</button>
        </form>
      </header>
      {children}
    </AppShell>
  );
}
