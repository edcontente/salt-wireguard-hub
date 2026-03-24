import React from "react";
import type { ProposalPresentationViewModel } from "@/lib/proposals/proposal-editor.types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

type ProposalPublicViewProps = {
  proposal: ProposalPresentationViewModel;
};

export function ProposalPublicView({ proposal }: ProposalPublicViewProps) {
  return (
    <article>
      <header>
        <p>{proposal.number}</p>
        <p>{proposal.versionLabel}</p>
        <h1>{proposal.title}</h1>
        <p>Cliente: {proposal.customerName}</p>
        <p>{proposal.intro}</p>
        <p>Total: {formatCurrency(proposal.totalPrice)}</p>
      </header>
      {proposal.sections.map((section) => (
        <section key={section.id}>
          <header>
            <h2>{section.title}</h2>
            <p>Subtotal: {formatCurrency(section.totalPrice)}</p>
          </header>
          <div>
            {section.items.map((item) => (
              <article key={item.id}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={item.name}
                    src={item.imageUrl}
                    style={{ maxWidth: "280px", width: "100%" }}
                  />
                ) : null}
                <p>{item.typeLabel}</p>
                <h3>{item.name}</h3>
                {item.description ? <p>{item.description}</p> : null}
                <p>
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </p>
                <p>Total do item: {formatCurrency(item.totalPrice)}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
