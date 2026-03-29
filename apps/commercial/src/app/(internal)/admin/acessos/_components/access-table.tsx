"use client";

import React from "react";
import SmartTable, { ColumnConfig } from "@/components/smart-table";
import { revokePublicLinkAction, bulkRevokePublicLinksAction } from "../../actions";
import { Shield, ExternalLink, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AccessTable({ publicLinks }: { publicLinks: any[] }) {
  const columns: ColumnConfig<any>[] = [
    {
      key: "proposal",
      label: "Proposta",
      sortable: true,
      render: (link: any) => (
        <div>
          <div className="font-bold text-slate-800">
            {link.proposalVersion.proposal.number}
          </div>
          <div className="text-xs text-slate-500">
            {link.proposalVersion.proposal.customerName}
          </div>
        </div>
      )
    },
    {
      key: "token",
      label: "Token / Link",
      render: (link: any) => (
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
          <ExternalLink size={12} />
          {link.token.substring(0, 12)}...
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (link: any) => {
        const isRevoked = !!link.revokedAt;
        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
        
        if (isRevoked) return <span className="badge-error flex items-center gap-1 w-fit"><XCircle size={12} /> Revogado</span>;
        if (isExpired) return <span className="badge-warning flex items-center gap-1 w-fit"><Clock size={12} /> Expirado</span>;
        return <span className="badge-success flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> Ativo</span>;
      }
    },
    {
      key: "accessCount",
      label: "Acessos",
      sortable: true,
      align: "center",
      render: (link: any) => <span className="font-mono font-bold">{link.accessCount}</span>
    },
    {
      key: "createdAt",
      label: "Criado em",
      sortable: true,
      render: (link: any) => format(new Date(link.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })
    },
    {
      key: "actions",
      label: "Ações",
      align: "center",
      render: (link: any) => (
        !link.revokedAt && (
           <button 
             onClick={async () => {
                if (confirm("Revogar este link permanentemente?")) {
                   await revokePublicLinkAction(link.id);
                }
             }}
             className="text-xs font-black text-red-600 hover:text-red-800 transition-colors uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100"
           >
              Revogar
           </button>
        )
      )
    }
  ];

  return (
    <SmartTable 
      data={publicLinks} 
      columns={columns} 
      storageKey="admin_public_links" 
      selectable
      onBulkDelete={bulkRevokePublicLinksAction}
      emptyMessage="Nenhum link público gerado ainda."
    />
  );
}
