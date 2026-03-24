import React from "react";
import type {
  ProposalCatalogOption,
  ProposalEditorItemViewModel,
  ProposalFormAction
} from "@/lib/proposals/proposal-editor.types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatItemType(type: ProposalEditorItemViewModel["type"]) {
  if (type === "PRODUCT") {
    return "Produto";
  }

  if (type === "SERVICE") {
    return "Servico";
  }

  return "Manual";
}

type ProposalItemsTableProps = {
  sectionId: string;
  items: ProposalEditorItemViewModel[];
  catalogItems: ProposalCatalogOption[];
  addItemAction: ProposalFormAction;
  editable: boolean;
  maxFinalPriceAdjustment: number;
};

export function ProposalItemsTable({
  sectionId,
  items,
  catalogItems,
  addItemAction,
  editable,
  maxFinalPriceAdjustment
}: ProposalItemsTableProps) {
  return (
    <div>
      {items.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Item</th>
              <th>Quantidade</th>
              <th>Valor unitario</th>
              <th>Desconto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatItemType(item.type)}</td>
                <td>
                  <strong>{item.name}</strong>
                  {item.description ? <p>{item.description}</p> : null}
                </td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{item.discountPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum item neste ambiente ainda.</p>
      )}
      <form action={addItemAction}>
        <fieldset disabled={!editable}>
          <legend>Adicionar item</legend>
          <input type="hidden" name="sectionId" value={sectionId} />
          <label>
            Item do catalogo
            <select name="commercialItemId" defaultValue="" required>
              <option disabled value="">
                Selecione um item
              </option>
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.type === "PRODUCT" ? "Produto" : "Servico"})
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input
              name="quantity"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue="1"
              required
            />
          </label>
          <label>
            Valor unitario
            <input name="unitPrice" type="number" min="0" step="0.01" />
          </label>
          <label>
            Descricao comercial
            <textarea name="description" />
          </label>
          <button type="submit">Adicionar item</button>
        </fieldset>
      </form>
      <p>
        Sua alcada permite ate {maxFinalPriceAdjustment}% de ajuste sobre o valor
        de referencia do item.
      </p>
      {!editable ? (
        <p>Esta versao esta congelada. Crie uma revisao para continuar editando.</p>
      ) : null}
    </div>
  );
}
