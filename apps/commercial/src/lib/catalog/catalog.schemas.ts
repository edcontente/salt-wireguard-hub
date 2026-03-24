import { z } from "zod";

export const commercialItemTypeSchema = z.enum(["PRODUCT", "SERVICE"]);

export const commercialItemSchema = z.object({
  id: z.string().cuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().trim().nullish(),
  category: z.string().min(1),
  type: commercialItemTypeSchema,
  unitPrice: z.number().nonnegative(),
  active: z.boolean(),
  createdById: z.string().cuid(),
  updatedById: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const createCommercialItemSchema = commercialItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateCommercialItemSchema = createCommercialItemSchema.partial();

export type CommercialItemType = z.infer<typeof commercialItemTypeSchema>;
export type CommercialItem = z.infer<typeof commercialItemSchema>;
export type CreateCommercialItemInput = z.infer<
  typeof createCommercialItemSchema
>;
export type UpdateCommercialItemInput = z.infer<
  typeof updateCommercialItemSchema
>;
