import { CatalogItemForm } from "@/components/catalog-item-form";
import { CatalogTable } from "@/components/catalog-table";
import { requireCommercialSession } from "@/lib/auth/session";
import { searchCatalogItems } from "@/lib/catalog/catalog.service";
import { createCatalogItemAction } from "./actions";

type CatalogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const user = await requireCommercialSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query =
    typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q : undefined;
  const items = await searchCatalogItems(query);

  return (
    <section>
      <header>
        <p>Catalogo comercial</p>
        <h2>Produtos e servicos</h2>
      </header>
      <form method="get">
        <label htmlFor="catalog-search">Buscar por nome ou SKU</label>
        <input
          id="catalog-search"
          name="q"
          defaultValue={query}
          placeholder="Ex.: SKU-VIDEO ou Projetor"
        />
        <button type="submit">Buscar</button>
      </form>
      {user.canManageCatalog ? (
        <CatalogItemForm action={createCatalogItemAction} canManageCatalog />
      ) : (
        <p>Seu perfil pode visualizar o catalogo, mas nao pode cadastrar itens.</p>
      )}
      <CatalogTable items={items} />
    </section>
  );
}
