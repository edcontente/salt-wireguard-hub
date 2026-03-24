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

export async function searchCatalogItems(query?: string) {
  const trimmedQuery = query?.trim();

  return db.commercialItem.findMany({
    where: trimmedQuery
      ? {
          OR: [
            {
              name: {
                contains: trimmedQuery
              }
            },
            {
              sku: {
                contains: trimmedQuery
              }
            }
          ]
        }
      : undefined,
    orderBy: {
      name: "asc"
    }
  });
}
