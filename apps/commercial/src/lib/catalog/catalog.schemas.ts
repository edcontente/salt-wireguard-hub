import { z } from "zod";

export const commercialItemTypeSchema = z.enum(["PRODUCT", "SERVICE"]);

const commonCommercialItemFields = {
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  unit: z.string().min(1),
  baseCost: z.number().nonnegative(),
  referencePrice: z.number().nonnegative(),
  commercialDescription: z.string().min(1),
  active: z.boolean().default(true),
  manufacturer: z.string().trim().min(1).nullable(),
  model: z.string().trim().min(1).nullable(),
  sku: z.string().trim().min(1).nullable(),
  ean: z.string().trim().min(1).nullable(),
  imageUrl: z.string().url().nullable(),
  operationalDescription: z.string().trim().min(1).nullable()
};

export const createProductSchema = z.object({
  type: z.literal("PRODUCT"),
  ...commonCommercialItemFields,
  manufacturer: z.string().trim().min(1),
  model: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  ean: z.string().trim().min(1).nullable().optional().default(null),
  imageUrl: z.string().url().nullable().optional().default(null),
  operationalDescription: z.null().optional().default(null)
});

export const createServiceSchema = z.object({
  type: z.literal("SERVICE"),
  ...commonCommercialItemFields,
  manufacturer: z.null().optional().default(null),
  model: z.null().optional().default(null),
  sku: z.null().optional().default(null),
  ean: z.null().optional().default(null),
  imageUrl: z.null().optional().default(null),
  operationalDescription: z.string().trim().min(1)
});

export const createCommercialItemSchema = z.discriminatedUnion("type", [
  createProductSchema,
  createServiceSchema
]);

const persistedCommercialItemFields = {
  id: z.string().cuid(),
  createdById: z.string().cuid(),
  updatedById: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date()
};

export const commercialItemSchema = z.discriminatedUnion("type", [
  createProductSchema.extend(persistedCommercialItemFields),
  createServiceSchema.extend(persistedCommercialItemFields)
]);

export const updateCommercialItemSchema = z
  .object({
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    subcategory: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    baseCost: z.number().nonnegative().optional(),
    referencePrice: z.number().nonnegative().optional(),
    commercialDescription: z.string().min(1).optional(),
    active: z.boolean().optional(),
    manufacturer: z.string().trim().min(1).nullable().optional(),
    model: z.string().trim().min(1).nullable().optional(),
    sku: z.string().trim().min(1).nullable().optional(),
    ean: z.string().trim().min(1).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    operationalDescription: z.string().trim().min(1).nullable().optional()
  })
  .partial();

export type CommercialItemType = z.infer<typeof commercialItemTypeSchema>;
export type CommercialItem = z.infer<typeof commercialItemSchema>;
export type CreateCommercialItemInput = z.infer<
  typeof createCommercialItemSchema
>;
export type UpdateCommercialItemInput = z.infer<
  typeof updateCommercialItemSchema
>;
