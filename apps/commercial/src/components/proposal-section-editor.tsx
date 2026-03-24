import React from "react";
import type {
  ProposalCatalogOption,
  ProposalEditorSectionViewModel,
  ProposalFormAction
} from "@/lib/proposals/proposal-editor.types";
import { ProposalItemsTable } from "./proposal-items-table";

type ProposalSectionEditorProps = {
  section: ProposalEditorSectionViewModel;
  catalogItems: ProposalCatalogOption[];
  addItemAction: ProposalFormAction;
  editable: boolean;
  maxFinalPriceAdjustment: number;
};

export function ProposalSectionEditor({
  section,
  catalogItems,
  addItemAction,
  editable,
  maxFinalPriceAdjustment
}: ProposalSectionEditorProps) {
  return (
    <section>
      <header>
        <h3>{section.title}</h3>
        {section.description ? <p>{section.description}</p> : null}
      </header>
      <ProposalItemsTable
        sectionId={section.id}
        items={section.items}
        catalogItems={catalogItems}
        addItemAction={addItemAction}
        editable={editable}
        maxFinalPriceAdjustment={maxFinalPriceAdjustment}
      />
    </section>
  );
}
