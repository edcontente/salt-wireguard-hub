import React from "react";
import type {
  ProposalCatalogOption,
  ProposalEditorViewModel,
  ProposalFormAction
} from "@/lib/proposals/proposal-editor.types";
import { ProposalSectionEditor } from "./proposal-section-editor";
import { ProposalStatusBadge } from "./proposal-status-badge";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

type ProposalEditorProps = {
  proposal: ProposalEditorViewModel;
  catalogItems: ProposalCatalogOption[];
  addSectionAction: ProposalFormAction;
  addItemAction: ProposalFormAction;
  sendVersionAction: ProposalFormAction;
  createRevisionAction: ProposalFormAction;
  approveAction: ProposalFormAction;
  loseAction: ProposalFormAction;
  errorMessage?: string;
  showPurchaseOrderPrompt?: boolean;
};

export function ProposalEditor({
  proposal,
  catalogItems,
  addSectionAction,
  addItemAction,
  sendVersionAction,
  createRevisionAction,
  approveAction,
  loseAction,
  errorMessage,
  showPurchaseOrderPrompt
}: ProposalEditorProps) {
  const editable = proposal.versionStatus === "DRAFT";
  const canReviewDecision = proposal.status === "SENT";
  const canCreateRevision = !editable && proposal.status === "SENT";

  return (
    <section>
      <header>
        <p>{proposal.number}</p>
        {proposal.versionLabel !== proposal.number ? <p>{proposal.versionLabel}</p> : null}
        <h2>{proposal.title}</h2>
        <p>Cliente: {proposal.customerName}</p>
        {proposal.customerEmail ? <p>{proposal.customerEmail}</p> : null}
        <p>
          Status: <ProposalStatusBadge status={proposal.status} />
        </p>
        <p>Total da proposta: {formatCurrency(proposal.total)}</p>
      </header>
      {errorMessage ? <p aria-live="polite">{errorMessage}</p> : null}
      <div>
        {editable ? (
          <form action={sendVersionAction}>
            <button type="submit">Enviar versao</button>
          </form>
        ) : canCreateRevision ? (
          <form action={createRevisionAction}>
            <button type="submit">Criar revisao</button>
          </form>
        ) : null}
        {canReviewDecision ? (
          <form action={approveAction}>
            <button type="submit">Marcar como aprovada</button>
          </form>
        ) : null}
        {canReviewDecision ? (
          <form action={loseAction}>
            <button type="submit">Marcar como perdida</button>
          </form>
        ) : null}
        {proposal.publicSharePath ? (
          <a href={proposal.publicSharePath} target="_blank" rel="noreferrer">
            Abrir link publico
          </a>
        ) : null}
        {proposal.pdfPath ? (
          <a href={proposal.pdfPath} target="_blank" rel="noreferrer">
            Abrir PDF
          </a>
        ) : null}
      </div>
      {showPurchaseOrderPrompt ? (
        <p>
          Proposta aprovada. Deseja iniciar um pedido de compra para o fornecedor?
        </p>
      ) : null}
      <form action={addSectionAction}>
        <fieldset disabled={!editable}>
          <legend>Adicionar ambiente</legend>
          <label>
            Ambiente
            <input name="title" required />
          </label>
          <label>
            Observacao
            <textarea name="description" />
          </label>
          <button type="submit">Adicionar ambiente</button>
        </fieldset>
      </form>
      {proposal.sections.length > 0 ? (
        proposal.sections.map((section) => (
          <ProposalSectionEditor
            key={section.id}
            section={section}
            catalogItems={catalogItems}
            addItemAction={addItemAction}
            editable={editable}
            maxFinalPriceAdjustment={proposal.maxFinalPriceAdjustment}
          />
        ))
      ) : (
        <p>Comece adicionando o primeiro ambiente da proposta.</p>
      )}
    </section>
  );
}
