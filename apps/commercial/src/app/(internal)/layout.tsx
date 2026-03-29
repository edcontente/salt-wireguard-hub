import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireCommercialSession } from "@/lib/auth/session";

type InternalLayoutProps = {
  children: ReactNode;
};

export default async function InternalLayout({ children }: InternalLayoutProps) {
  const user = await requireCommercialSession();

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}
