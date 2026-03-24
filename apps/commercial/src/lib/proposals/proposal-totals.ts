type TotalsItemInput = {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
};

type TotalsSectionInput = {
  id: string;
  title: string;
  items: TotalsItemInput[];
};

export function calculateItemSubtotal(item: TotalsItemInput) {
  const grossTotal = item.quantity * item.unitPrice;
  const discountFactor = 1 - item.discountPercent / 100;

  return Math.round(grossTotal * discountFactor * 100) / 100;
}

export function calculateSectionSubtotal(items: TotalsItemInput[]) {
  return Math.round(
    items.reduce((total, item) => total + calculateItemSubtotal(item), 0) * 100
  ) / 100;
}

export function calculateProposalTotals(sections: TotalsSectionInput[]) {
  const sectionTotals = sections.map((section) => ({
    id: section.id,
    title: section.title,
    subtotal: calculateSectionSubtotal(section.items)
  }));

  const total =
    Math.round(
      sectionTotals.reduce((sum, section) => sum + section.subtotal, 0) * 100
    ) / 100;

  return {
    sections: sectionTotals,
    total
  };
}
