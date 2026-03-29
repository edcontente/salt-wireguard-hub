import { CatalogView } from "@/components/catalog-view";
import { requireCommercialSession } from "@/lib/auth/session";
import { listGlobalSystems } from "@/lib/systems/system.service";
import { createCatalogItemAction } from "../catalogo/actions";

export default async function SistemasPage() {
  const user = await requireCommercialSession();
  const systems = await listGlobalSystems();

  // Map GlobalSystem to the expected 'items' shape if needed, 
  // though CatalogView might need a slight adjustment or we just pass them.
  return (
    <CatalogView
      title="Sistemas"
      description="Gerenciamento de subsistemas estruturais técnicos (Áudio, Vídeo, Rede, etc.)."
      items={systems}
      canManage={user.canManageUsers || user.profile.isSystem}
      createAction={createCatalogItemAction}
    />
  );
}
