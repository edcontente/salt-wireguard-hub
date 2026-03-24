import React from "react";
import { render, screen } from "@testing-library/react";
import { ProposalPublicView } from "./proposal-public-view";

describe("ProposalPublicView", () => {
  it("renders sections, items with image and description, and hides internal data", () => {
    render(
      <ProposalPublicView
        proposal={{
          number: "PROP-2026-001",
          versionLabel: "PROP-2026-001-REV1",
          title: "Residencia Contente",
          customerName: "Edgard Contente",
          intro: "Proposta comercial para automacao e audio e video.",
          sections: [
            {
              id: "section-1",
              title: "Sala de TV",
              items: [
                {
                  id: "item-1",
                  typeLabel: "Produto",
                  name: "Projetor Laser 4K",
                  description: "Modelo com lente curta e memoria de cenas.",
                  imageUrl: "https://example.com/projetor.jpg",
                  quantity: 1,
                  unitPrice: 32000,
                  totalPrice: 32000
                }
              ],
              totalPrice: 32000
            },
            {
              id: "section-2",
              title: "Rack tecnico",
              items: [
                {
                  id: "item-2",
                  typeLabel: "Servico",
                  name: "Instalacao e calibracao",
                  description: "Configuracao, testes e entrega assistida.",
                  imageUrl: null,
                  quantity: 1,
                  unitPrice: 4700,
                  totalPrice: 4700
                }
              ],
              totalPrice: 4700
            }
          ],
          totalPrice: 36700
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /residencia contente/i })).toBeInTheDocument();
    expect(screen.getByText("PROP-2026-001-REV1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sala de TV" })).toBeInTheDocument();
    expect(screen.getByText("Projetor Laser 4K")).toBeInTheDocument();
    expect(screen.getByAltText("Projetor Laser 4K")).toHaveAttribute(
      "src",
      "https://example.com/projetor.jpg"
    );
    expect(screen.getByText(/modelo com lente curta/i)).toBeInTheDocument();
    expect(screen.queryByText(/custo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/alcada/i)).not.toBeInTheDocument();
  });
});
