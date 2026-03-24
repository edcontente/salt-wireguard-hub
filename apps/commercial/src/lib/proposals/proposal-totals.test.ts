import { describe, expect, it } from "vitest";
import {
  calculateProposalTotals,
  calculateSectionSubtotal
} from "./proposal-totals";

describe("proposal totals", () => {
  it("sums section subtotal", () => {
    const subtotal = calculateSectionSubtotal([
      {
        quantity: 1,
        unitPrice: 3000,
        discountPercent: 0
      },
      {
        quantity: 2,
        unitPrice: 500,
        discountPercent: 10
      }
    ]);

    expect(subtotal).toBe(3900);
  });

  it("sums section totals and grand total", () => {
    const totals = calculateProposalTotals([
      {
        id: "sec_1",
        title: "Sala",
        items: [
          {
            quantity: 1,
            unitPrice: 3000,
            discountPercent: 0
          }
        ]
      },
      {
        id: "sec_2",
        title: "Home Theater",
        items: [
          {
            quantity: 2,
            unitPrice: 1000,
            discountPercent: 20
          }
        ]
      }
    ]);

    expect(totals.sections[0]?.subtotal).toBe(3000);
    expect(totals.sections[1]?.subtotal).toBe(1600);
    expect(totals.total).toBe(4600);
  });
});
