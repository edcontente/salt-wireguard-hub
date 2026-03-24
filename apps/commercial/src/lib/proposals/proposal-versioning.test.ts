import { describe, expect, it } from "vitest";
import {
  buildSentVersionSnapshot,
  createRevisionDraftFromVersion
} from "./proposal-versioning";

describe("proposal versioning", () => {
  it("freezes a sent version with totals snapshot", () => {
    const snapshot = buildSentVersionSnapshot({
      proposalId: "prop_1",
      proposalNumber: "PROP-2026-001",
      versionId: "ver_1",
      label: "PROP-2026-001",
      revisionNumber: 0,
      sections: [
        {
          id: "sec_1",
          title: "Sala",
          subtotal: 4200
        }
      ],
      total: 4200
    });

    expect(snapshot.status).toBe("LOCKED");
    expect(snapshot.snapshotTotals.total).toBe(4200);
    expect(snapshot.snapshotTotals.sections[0]?.title).toBe("Sala");
  });

  it("creates REV1 from the current locked version", () => {
    const revision = createRevisionDraftFromVersion({
      proposalNumber: "PROP-2026-001",
      currentRevision: 0,
      sourceVersion: {
        id: "ver_1",
        label: "PROP-2026-001",
        revisionNumber: 0,
        sections: [
          {
            id: "sec_1",
            title: "Sala",
            description: "Ambiente principal",
            position: 0,
            items: [
              {
                id: "item_1",
                commercialItemId: "catalog_1",
                name: "Projetor 4K",
                description: "Modelo principal",
                quantity: 1,
                unitPrice: 12000,
                discountPercent: 0,
                position: 0
              }
            ]
          }
        ]
      }
    });

    expect(revision.revisionNumber).toBe(1);
    expect(revision.label).toBe("PROP-2026-001-REV1");
    expect(revision.sections).toHaveLength(1);
    expect(revision.sections[0]?.items[0]?.name).toBe("Projetor 4K");
  });
});
