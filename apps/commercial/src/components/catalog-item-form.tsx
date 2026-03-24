import type { CreateCommercialItemAction } from "@/app/(internal)/catalogo/actions";

type CatalogItemFormProps = {
  action: CreateCommercialItemAction;
  canManageCatalog: boolean;
};

export function CatalogItemForm({
  action,
  canManageCatalog
}: CatalogItemFormProps) {
  return (
    <form action={action}>
      <fieldset disabled={!canManageCatalog}>
        <legend>Novo item do catalogo</legend>
        <label>
          Tipo
          <select name="type" defaultValue="PRODUCT">
            <option value="PRODUCT">Produto</option>
            <option value="SERVICE">Servico</option>
          </select>
        </label>
        <label>
          Codigo
          <input name="code" required />
        </label>
        <label>
          Nome
          <input name="name" required />
        </label>
        <label>
          Categoria
          <input name="category" required />
        </label>
        <label>
          Subcategoria
          <input name="subcategory" required />
        </label>
        <label>
          Unidade
          <input name="unit" defaultValue="UN" required />
        </label>
        <label>
          Custo base
          <input name="baseCost" type="number" step="0.01" min="0" required />
        </label>
        <label>
          Preco de referencia
          <input
            name="referencePrice"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </label>
        <label>
          Descricao comercial
          <textarea name="commercialDescription" required />
        </label>
        <label>
          Fabricante
          <input name="manufacturer" />
        </label>
        <label>
          Modelo
          <input name="model" />
        </label>
        <label>
          SKU
          <input name="sku" />
        </label>
        <label>
          EAN
          <input name="ean" />
        </label>
        <label>
          URL da imagem
          <input name="imageUrl" type="url" />
        </label>
        <label>
          Descricao operacional
          <textarea name="operationalDescription" />
        </label>
        <button type="submit">Salvar item</button>
      </fieldset>
    </form>
  );
}
