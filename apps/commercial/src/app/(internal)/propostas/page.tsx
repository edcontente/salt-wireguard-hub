import Link from "next/link";
import { ProposalStatusBadge } from "@/components/proposal-status-badge";
import { requireCommercialSession } from "@/lib/auth/session";
import { listProposalSummaries } from "@/lib/proposals/proposal.service";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export default async function ProposalsPage() {
  const user = await requireCommercialSession();

  if (!user.canManageProposals) {
    return <p>Seu perfil nao tem permissao para gerenciar propostas.</p>;
  }

  const proposals = await listProposalSummaries();

  return (
    <section>
      <header>
        <p>Backoffice comercial</p>
        <h2>Propostas</h2>
        <Link href="/propostas/nova">Nova proposta</Link>
      </header>
      {proposals.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Numero</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Total</th>
              <th>Abrir</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>
                  <strong>{proposal.number}</strong>
                  {proposal.versionLabel !== proposal.number ? (
                    <p>{proposal.versionLabel}</p>
                  ) : null}
                </td>
                <td>
                  <strong>{proposal.customerName}</strong>
                  <p>{proposal.title}</p>
                </td>
                <td>
                  <ProposalStatusBadge status={proposal.status} />
                </td>
                <td>{formatCurrency(proposal.total)}</td>
                <td>
                  <Link href={`/propostas/${proposal.id}`}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhuma proposta criada ainda. Comece pelo primeiro rascunho.</p>
      )}
    </section>
  );
}
