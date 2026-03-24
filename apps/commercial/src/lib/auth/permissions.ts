type CommercialProfilePermission = {
  maxFinalPriceAdjustment: number;
};

export function canAdjustProposalTotal(
  profile: CommercialProfilePermission,
  requestedAdjustmentPercent: number
) {
  return requestedAdjustmentPercent <= profile.maxFinalPriceAdjustment;
}
