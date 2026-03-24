import { notFound } from "next/navigation";
import { ProposalPublicView } from "@/components/proposal-public-view";
import { getProposalPresentationByPublicShare } from "@/lib/proposals/proposal-presenter";

type PublicProposalPageProps = {
  params: Promise<{
    publicToken: string;
  }>;
};

export default async function PublicProposalPage({
  params
}: PublicProposalPageProps) {
  const { publicToken } = await params;

  try {
    const proposal = await getProposalPresentationByPublicShare(publicToken);

    return <ProposalPublicView proposal={proposal} />;
  } catch {
    notFound();
  }
}
