import { z } from "zod";

export const proposalStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "APPROVED",
  "LOST",
  "ARCHIVED"
]);

export const proposalVersionStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "LOCKED"
]);

export const proposalAuditActionSchema = z.enum([
  "CREATED",
  "UPDATED",
  "SECTION_ADDED",
  "ITEM_ADDED",
  "VERSION_SENT",
  "REVISION_CREATED",
  "APPROVED",
  "LOST"
]);

export const proposalSectionSchema = z.object({
  id: z.string().cuid(),
  proposalVersionId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().trim().nullish(),
  position: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const proposalItemSchema = z.object({
  id: z.string().cuid(),
  proposalSectionId: z.string().cuid(),
  commercialItemId: z.string().cuid().nullish(),
  name: z.string().min(1),
  description: z.string().trim().nullish(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0),
  position: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const proposalSchema = z.object({
  id: z.string().cuid(),
  number: z.string().min(1),
  title: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email().nullish(),
  status: proposalStatusSchema,
  currentRevision: z.number().int().nonnegative(),
  createdById: z.string().cuid(),
  updatedById: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
export type ProposalVersionStatus = z.infer<
  typeof proposalVersionStatusSchema
>;
export type ProposalAuditAction = z.infer<typeof proposalAuditActionSchema>;
export type ProposalSection = z.infer<typeof proposalSectionSchema>;
export type ProposalItem = z.infer<typeof proposalItemSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
