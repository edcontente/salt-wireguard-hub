import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();
const filePath = "/Users/edgardcontente/Library/Mobile Documents/com~apple~CloudDocs/Downloads/cliente_fornecedor 30032026-1.xlsx";

async function main() {
  console.log("🔍 Diagnóstico de Emergência: Rosa Maria / Mont Joli");

  // 1. Verificar registros por nome no Banco
  const dbPartners = await prisma.partner.findMany({
    where: {
      OR: [
        { name: { contains: "Rosa Maria", mode: "insensitive" } },
        { companyName: { contains: "Rosa Maria", mode: "insensitive" } },
        { name: { contains: "Mont Joli", mode: "insensitive" } },
        { companyName: { contains: "Mont Joli", mode: "insensitive" } },
      ]
    }
  });

  console.log("\n--- Registros Localizados no Supabase ---");
  console.log(JSON.stringify(dbPartners, null, 2));

  // 2. Verificar Abas da Planilha
  const workbook = XLSX.readFile(filePath);
  console.log("\n--- Abas da Planilha iCloud ---");
  console.log(workbook.SheetNames);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
