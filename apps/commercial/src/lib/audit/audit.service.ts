import { db } from "../db";

type RecordProposalAuditEventInput = {
  proposalId: string;
  proposalVersionId?: string | null;
  userId?: string | null;
  action: string;
  message: string;
  details?: unknown;
};

export async function recordProposalAuditEvent(
  input: RecordProposalAuditEventInput
) {
  return db.proposalAuditLog.create({
    data: {
      proposalId: input.proposalId,
      proposalVersionId: input.proposalVersionId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      message: input.message,
      details:
        typeof input.details === "undefined"
          ? null
          : JSON.stringify(input.details)
    }
  });
}
