import { CatalogView } from "@/components/catalog-view";
import { requireCommercialSession } from "@/lib/auth/session";
import { listPricingRules } from "@/lib/pricing/pricing.service";
import { createCatalogItemAction } from "../catalogo/actions";

export default async function RegrasPrecoPage() {
  const user = await requireCommercialSession();
  const rules = await listPricingRules();

  // Map PricingRule to CatalogItem shape for the table
  const mappedItems = rules.map(rule => ({
    id: rule.id,
    type: "RULE",
    name: rule.name,
    category: rule.category || "Margem",
    subcategory: rule.subcategory || "Geral",
    code: "REGRA",
    sku: null,
    marginMultiplier: rule.marginMultiplier,
    active: rule.active
  }));

  return (
    <CatalogView
      title="Regras de Preço"
      description="Gerenciamento de multiplicadores de margem e regras comerciais por categoria."
      items={mappedItems as any}
      canManage={user.canManageCatalog || user.profile.isSystem}
      createAction={createCatalogItemAction}
    />
  );
}
