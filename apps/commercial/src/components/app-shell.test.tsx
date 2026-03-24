import React from "react";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the module title", () => {
    render(
      <AppShell>
        <p>Conteudo de teste</p>
      </AppShell>
    );

    expect(screen.getByRole("heading", { name: /comercial/i })).toBeInTheDocument();
  });

  it("renders child content", () => {
    render(
      <AppShell>
        <p>Conteudo de teste</p>
      </AppShell>
    );

    expect(screen.getByText("Conteudo de teste")).toBeInTheDocument();
  });

  it("renders the side menu entries", () => {
    render(
      <AppShell>
        <p>Conteudo de teste</p>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: "Catalogo" })).toHaveAttribute("href", "/catalogo");
    expect(screen.getByRole("link", { name: "Propostas" })).toHaveAttribute("href", "/propostas");
  });
});
