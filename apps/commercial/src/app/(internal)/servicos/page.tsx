import { CatalogView } from "@/components/catalog-view";
import { requireCommercialSession } from "@/lib/auth/session";
import { searchCatalogItems } from "@/lib/catalog/catalog.service";
import { createCatalogItemAction } from "../catalogo/actions";

export default async function ServicosPage() {
  const user = await requireCommercialSession();
  const items = await searchCatalogItems({ type: "SERVICE" });

  return (
    <CatalogView
      title="Serviços"
      description="Gerenciamento de mão de obra, instalações e consultoria."
      items={items}
      canManage={user.canManageCatalog}
      createAction={createCatalogItemAction}
      defaultValues={{ type: "SERVICE" }}
    />
  );
}
