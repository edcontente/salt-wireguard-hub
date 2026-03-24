import type {
  ProposalStatus,
  ProposalVersionStatus
} from "./proposal.schemas";

export type ProposalEditorItemType = "PRODUCT" | "SERVICE" | "MANUAL";

export type ProposalEditorItemViewModel = {
  id: string;
  type: ProposalEditorItemType;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  referencePrice: number;
};

export type ProposalEditorSectionViewModel = {
  id: string;
  title: string;
  description?: string | null;
  items: ProposalEditorItemViewModel[];
};

export type ProposalEditorViewModel = {
  id: string;
  number: string;
  versionLabel: string;
  versionStatus: ProposalVersionStatus;
  title: string;
  customerName: string;
  customerEmail?: string | null;
  status: ProposalStatus;
  total: number;
  maxFinalPriceAdjustment: number;
  currentVersionId: string;
  sections: ProposalEditorSectionViewModel[];
};

export type ProposalCatalogOption = {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  referencePrice: number;
};

export type ProposalSummaryViewModel = {
  id: string;
  number: string;
  versionLabel: string;
  title: string;
  customerName: string;
  status: ProposalStatus;
  total: number;
  updatedAt: Date;
};

export type ProposalFormAction =
  | ((formData: FormData) => Promise<void>)
  | string;
