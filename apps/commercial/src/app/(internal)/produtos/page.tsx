import { CatalogView } from "@/components/catalog-view";
import { requireCommercialSession } from "@/lib/auth/session";
import { searchCatalogItems } from "@/lib/catalog/catalog.service";
import { createCatalogItemAction } from "../catalogo/actions";

export default async function ProdutosPage() {
  const user = await requireCommercialSession();
  const items = await searchCatalogItems({ type: "PRODUCT" });

  return (
    <CatalogView
      title="Produtos"
      description="Gerenciamento de itens de hardware, equipamentos e materiais."
      items={items}
      canManage={user.canManageCatalog}
      createAction={createCatalogItemAction}
      defaultValues={{ type: "PRODUCT" }}
    />
  );
}
