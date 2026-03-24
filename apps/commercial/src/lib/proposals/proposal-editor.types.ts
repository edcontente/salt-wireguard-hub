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
  publicSharePath?: string | null;
  pdfPath?: string | null;
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

export type ProposalPresentationItemViewModel = {
  id: string;
  typeLabel: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type ProposalPresentationSectionViewModel = {
  id: string;
  title: string;
  items: ProposalPresentationItemViewModel[];
  totalPrice: number;
};

export type ProposalPresentationViewModel = {
  number: string;
  versionLabel: string;
  title: string;
  customerName: string;
  intro: string;
  sections: ProposalPresentationSectionViewModel[];
  totalPrice: number;
};
