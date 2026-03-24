import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalDocument } from "@/components/pdf/proposal-document";
import { getProposalPresentationByProposalId } from "@/lib/proposals/proposal-presenter";

type ProposalPdfRouteProps = {
  params: Promise<{
    proposalId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: ProposalPdfRouteProps
) {
  const { proposalId } = await params;

  try {
    const proposal = await getProposalPresentationByProposalId(proposalId);
    const pdfBuffer = await renderToBuffer(ProposalDocument({ proposal }));

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${proposal.versionLabel}.pdf"`
      }
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel gerar o PDF."
      },
      {
        status: 404
      }
    );
  }
}
