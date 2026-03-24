import { describe, expect, it } from "vitest";
import { canAdjustProposalTotal } from "./permissions";

describe("canAdjustProposalTotal", () => {
  it("allows discounts within the profile limit", () => {
    expect(
      canAdjustProposalTotal({ maxFinalPriceAdjustment: 15 }, 10)
    ).toBe(true);
  });

  it("blocks discounts above the profile limit", () => {
    expect(
      canAdjustProposalTotal({ maxFinalPriceAdjustment: 15 }, 20)
    ).toBe(false);
  });
});
