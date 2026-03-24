import React from "react";
import { render, screen } from "@testing-library/react";
import { ProposalEditor } from "./proposal-editor";

describe("ProposalEditor", () => {
  it("renders proposal sections, product and service items, status, and total", () => {
    render(
      <ProposalEditor
        proposal={{
          id: "proposal-1",
          number: "PROP-2026-001",
          versionLabel: "PROP-2026-001",
          versionStatus: "DRAFT",
          title: "Residencia Contente",
          customerName: "Edgard Contente",
          status: "DRAFT",
          total: 36700,
          maxFinalPriceAdjustment: 10,
          currentVersionId: "version-1",
          sections: [
            {
              id: "section-1",
              title: "Sala de TV",
              items: [
                {
                  id: "item-1",
                  type: "PRODUCT",
                  name: "Projetor Laser 4K",
                  description: "Modelo com lente curta",
                  quantity: 1,
                  unitPrice: 32000,
                  discountPercent: 0,
                  referencePrice: 32000
                }
              ]
            },
            {
              id: "section-2",
              title: "Rack tecnico",
              items: [
                {
                  id: "item-2",
                  type: "SERVICE",
                  name: "Instalacao e calibracao",
                  description: "Comissionamento completo do sistema",
                  quantity: 1,
                  unitPrice: 4700,
                  discountPercent: 0,
                  referencePrice: 4700
                }
              ]
            }
          ]
        }}
        catalogItems={[
          {
            id: "catalog-1",
            name: "Projetor Laser 4K",
            type: "PRODUCT",
            referencePrice: 32000
          },
          {
            id: "catalog-2",
            name: "Instalacao e calibracao",
            type: "SERVICE",
            referencePrice: 4700
          }
        ]}
        addSectionAction="/propostas/ambientes"
        addItemAction="/propostas/itens"
        sendVersionAction="/propostas/enviar"
        createRevisionAction="/propostas/revisoes"
        approveAction="/propostas/aprovar"
        loseAction="/propostas/perder"
      />
    );

    expect(screen.getByRole("heading", { name: /residencia contente/i })).toBeInTheDocument();
    expect(screen.getByText("PROP-2026-001")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*36\.700,00/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sala de TV" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rack tecnico" })).toBeInTheDocument();
    expect(screen.getByText("Projetor Laser 4K")).toBeInTheDocument();
    expect(screen.getByText("Instalacao e calibracao")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar ambiente/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /adicionar item/i })).toHaveLength(2);
  });
});
