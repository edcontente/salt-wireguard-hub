type CatalogTableProps = {
  items: Array<{
    id: string;
    type: string;
    code: string;
    name: string;
    category: string;
    subcategory: string;
    sku: string | null;
    referencePrice: number;
    active: boolean;
  }>;
};

export function CatalogTable({ items }: CatalogTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Codigo</th>
          <th>Nome</th>
          <th>Categoria</th>
          <th>Subcategoria</th>
          <th>SKU</th>
          <th>Preco ref.</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.type === "PRODUCT" ? "Produto" : "Servico"}</td>
            <td>{item.code}</td>
            <td>{item.name}</td>
            <td>{item.category}</td>
            <td>{item.subcategory}</td>
            <td>{item.sku ?? "-"}</td>
            <td>{item.referencePrice.toFixed(2)}</td>
            <td>{item.active ? "Ativo" : "Inativo"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
