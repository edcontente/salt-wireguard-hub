import { describe, expect, it } from "vitest";
import { buildProposalNumber, buildRevisionLabel } from "./proposal-numbering";

describe("proposal numbering", () => {
  it("builds the initial proposal number", () => {
    expect(buildProposalNumber(2026, 1)).toBe("PROP-2026-001");
  });

  it("builds a revision label", () => {
    expect(buildRevisionLabel("PROP-2026-001", 2)).toBe("PROP-2026-001-REV2");
  });
});
