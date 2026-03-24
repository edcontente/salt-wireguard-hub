"use server";

import { revalidatePath } from "next/cache";
import { requireCommercialSession } from "@/lib/auth/session";
import { createCatalogItem } from "@/lib/catalog/catalog.service";

function readOptionalField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export async function createCatalogItemAction(formData: FormData) {
  const user = await requireCommercialSession();

  if (!user.canManageCatalog) {
    throw new Error("Usuario sem permissao para gerenciar catalogo.");
  }

  const type = formData.get("type");
  const code = formData.get("code");
  const name = formData.get("name");
  const category = formData.get("category");
  const subcategory = formData.get("subcategory");
  const unit = formData.get("unit");
  const baseCost = formData.get("baseCost");
  const referencePrice = formData.get("referencePrice");
  const commercialDescription = formData.get("commercialDescription");

  if (
    typeof type !== "string" ||
    typeof code !== "string" ||
    typeof name !== "string" ||
    typeof category !== "string" ||
    typeof subcategory !== "string" ||
    typeof unit !== "string" ||
    typeof baseCost !== "string" ||
    typeof referencePrice !== "string" ||
    typeof commercialDescription !== "string"
  ) {
    throw new Error("Formulario invalido.");
  }

  if (type === "SERVICE") {
    await createCatalogItem(
      {
        type: "SERVICE",
        code,
        name,
        category,
        subcategory,
        unit,
        baseCost: Number(baseCost),
        referencePrice: Number(referencePrice),
        commercialDescription,
        manufacturer: null,
        model: null,
        sku: null,
        ean: null,
        imageUrl: null,
        operationalDescription:
          readOptionalField(formData, "operationalDescription") ?? "",
        active: true
      },
      user.id
    );
  } else {
    await createCatalogItem(
      {
        type: "PRODUCT",
        code,
        name,
        category,
        subcategory,
        unit,
        baseCost: Number(baseCost),
        referencePrice: Number(referencePrice),
        commercialDescription,
        manufacturer: readOptionalField(formData, "manufacturer") ?? "",
        model: readOptionalField(formData, "model") ?? "",
        sku: readOptionalField(formData, "sku") ?? "",
        ean: readOptionalField(formData, "ean"),
        imageUrl: readOptionalField(formData, "imageUrl"),
        operationalDescription: null,
        active: true
      },
      user.id
    );
  }

  revalidatePath("/catalogo");
}

export type CreateCommercialItemAction = typeof createCatalogItemAction;
