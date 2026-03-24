import { ProposalEditor } from "@/components/proposal-editor";
import { requireCommercialSession } from "@/lib/auth/session";
import {
  getProposalEditorData,
  listProposalCatalogOptions
} from "@/lib/proposals/proposal.service";
import {
  addProposalItemAction,
  addProposalSectionAction,
  approveProposalAction,
  createProposalRevisionAction,
  loseProposalAction,
  sendProposalVersionAction
} from "./actions";

type ProposalPageProps = {
  params: Promise<{
    proposalId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProposalPage({
  params,
  searchParams
}: ProposalPageProps) {
  const user = await requireCommercialSession();

  if (!user.canManageProposals) {
    return <p>Seu perfil nao tem permissao para gerenciar propostas.</p>;
  }

  const { proposalId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const proposal = await getProposalEditorData(
    proposalId,
    user.maxFinalPriceAdjustment
  );
  const catalogItems = await listProposalCatalogOptions();
  const errorParam =
    typeof resolvedSearchParams?.error === "string"
      ? decodeURIComponent(resolvedSearchParams.error)
      : undefined;

  return (
    <ProposalEditor
      proposal={proposal}
      catalogItems={catalogItems}
      addSectionAction={addProposalSectionAction.bind(
        null,
        proposal.id,
        proposal.currentVersionId
      )}
      addItemAction={addProposalItemAction.bind(null, proposal.id)}
      sendVersionAction={sendProposalVersionAction.bind(null, proposal.id)}
      createRevisionAction={createProposalRevisionAction.bind(null, proposal.id)}
      approveAction={approveProposalAction.bind(null, proposal.id)}
      loseAction={loseProposalAction.bind(null, proposal.id)}
      errorMessage={errorParam}
    />
  );
}
