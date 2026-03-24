export function buildProposalNumber(year: number, sequence: number): string {
  return `PROP-${year}-${String(sequence).padStart(3, "0")}`;
}

export function buildRevisionLabel(baseNumber: string, revision: number): string {
  return `${baseNumber}-REV${revision}`;
}
