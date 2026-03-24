import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalDocument } from "@/components/pdf/proposal-document";
import { getProposalPresentationForPdf } from "@/lib/proposals/proposal-presenter";

type ProposalPdfRouteProps = {
  params: Promise<{
    proposalId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: ProposalPdfRouteProps
) {
  const { proposalId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  try {
    if (!token) {
      throw new Error("Link publico invalido ou expirado.");
    }

    const proposal = await getProposalPresentationForPdf(proposalId, token);
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
