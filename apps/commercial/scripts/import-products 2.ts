/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function run() {
  const path = '/Users/edgardcontente/Library/Mobile Documents/com~apple~CloudDocs/Downloads/produto 25032026.xlsx';
  console.log(`Lendo arquivo: ${path}`);
  
  const buffer = fs.readFileSync(path);
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`Planilha carregada. Total de linhas: ${rows.length}`);

  // Fetching the user to attribute the creation/update
  // Assuming at least one user exists; if not, we must create a quick stub profile/user.
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log("Nenhum usuário encontrado. Criando stub user temporário para rodar a importação...");
    const profile = await prisma.commercialProfile.findFirst() || await prisma.commercialProfile.create({
      data: { name: "System Import", slug: "system-import", isSystem: true }
    });
    user = await prisma.user.create({
      data: {
        name: "Admin Importer",
        email: "admin@import.local",
        passwordHash: "stub",
        profileId: profile.id
      }
    });
  }

  // Find the highest existing SKU in DB
  const existingItems = await prisma.commercialItem.findMany({
    select: { sku: true }
  });

  let maxSkuNum = 0;
  for (const item of existingItems) {
    if (item.sku && !isNaN(Number(item.sku))) {
      maxSkuNum = Math.max(maxSkuNum, Number(item.sku));
    }
  }

  // Scan Excel rows to see if any SKU there pushes the max higher
  for (const row of rows) {
    if (row['Sku'] && !isNaN(Number(row['Sku']))) {
      maxSkuNum = Math.max(maxSkuNum, Number(row['Sku']));
    }
  }

  console.log(`Maior SKU conhecido na base/planilha: ${maxSkuNum}`);

  let addedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    // 1. Resolver SKU e identificador único
    let skuRaw = row['Sku'] ? String(row['Sku']).trim() : "";
    
    if (!skuRaw || isNaN(Number(skuRaw))) {
       maxSkuNum++;
       skuRaw = String(maxSkuNum);
    }
    
    const sku = skuRaw;
    const code = sku; // Usaremos SKU como code já que code tbm é unique

    const name = row['Produto']?.trim() || "Item sem descrição";
    const manufacturer = row['Marca']?.trim() || row['Fabricante']?.trim() || null;
    const model = row['Modelo']?.trim() || null;
    const category = row['Categoria']?.trim() || "Geral";
    const subcategory = row['Subcategoria']?.trim() || "Geral";
    const unit = row['Unidade']?.trim() || "UN";
    const baseCost = parseFloat(String(row['Preço Custo']).replace(',', '.')) || 0;
    const referencePrice = parseFloat(String(row['Venda']).replace(',', '.')) || 0;
    const active = row['Ativo'] === 1 || row['Ativo'] === "1" ? true : false;
    
    // Fallback do OMIE caso code já não seja útil, mas a demanda prioriza SKU.
    
    try {
      const existing = await prisma.commercialItem.findUnique({
        where: { sku }
      });

      if (existing) {
        await prisma.commercialItem.update({
          where: { sku },
          data: {
            name, category, subcategory, unit, baseCost,
            referencePrice, manufacturer, model, active,
            updatedById: user.id
          }
        });
        updatedCount++;
      } else {
        // As a safeguard if Code exists but SKU doesn't
        await prisma.commercialItem.upsert({
          where: { code },
          create: {
            code, sku, name, category, subcategory, type: "PRODUCT",
            unit, baseCost, referencePrice, manufacturer, model, active,
            createdById: user.id, updatedById: user.id
          },
          update: {
            sku, name, category, subcategory, type: "PRODUCT",
            unit, baseCost, referencePrice, manufacturer, model, active,
            updatedById: user.id
          }
        });
        addedCount++;
      }
    } catch(err) {
      console.log(`Erro processando linha com SKU: ${sku}`);
      console.error(err);
    }
  }

  console.log(`Importação Finalizada! Itens adicionados: ${addedCount} | Itens atualizados: ${updatedCount}`);
}

run().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
