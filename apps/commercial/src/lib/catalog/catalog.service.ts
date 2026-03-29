import { db } from "../db";
import {
  createCommercialItemSchema,
  type CreateCommercialItemInput
} from "./catalog.schemas";

export async function createCatalogItem(
  input: CreateCommercialItemInput,
  actorUserId: string
) {
  const parsedInput = createCommercialItemSchema.parse(input);

  return db.commercialItem.create({
    data: {
      ...parsedInput,
      createdById: actorUserId,
      updatedById: actorUserId
    }
  });
}

export async function searchCatalogItems(filters?: {
  query?: string;
  type?: string;
  category?: string;
}) {
  const trimmedQuery = filters?.query?.trim();

  return db.commercialItem.findMany({
    where: {
      AND: [
        trimmedQuery
          ? {
              OR: [
                { name: { contains: trimmedQuery } },
                { sku: { contains: trimmedQuery } }
              ]
            }
          : {},
        filters?.type ? { type: filters.type } : {},
        filters?.category ? { category: filters.category } : {}
      ]
    },
    orderBy: {
      name: "asc"
    }
  });
}
