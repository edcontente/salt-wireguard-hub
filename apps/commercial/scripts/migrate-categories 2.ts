import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log("Iniciando migração de banco de dados para Categorias Relacionais...");
  
  // Extrair categorias exclusivas dos produtos atuais
  const distinctCategories = await db.commercialItem.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  console.log(`> Encontradas ${distinctCategories.length} categorias em texto para conversão.`);

  for (const cat of distinctCategories) {
    if (!cat.category) continue;
    
    // UPSERT da categoria raiz Oficial
    const categoryRecord = await db.catalogCategory.upsert({
      where: { name: cat.category },
      update: {},
      create: { name: cat.category }
    });

    // Mapear todos os produtos que continham essa String para o ID relacional
    const updateCatResult = await db.commercialItem.updateMany({
      where: { category: cat.category },
      data: { catalogCategoryId: categoryRecord.id }
    });

    console.log(`✓ Categoria [${cat.category}] migrada. (${updateCatResult.count} itens linkados)`);

    // Obter todas as subcategorias isoladas DENTRO desta categoria
    const distinctSubcategories = await db.commercialItem.groupBy({
      by: ['subcategory'],
      where: { category: cat.category },
      _count: { id: true }
    });

    for (const sub of distinctSubcategories) {
       if (!sub.subcategory) continue;

       // A subcategoria tem constraint de unicidade: [CategoryId + Name]
       let subcatRecord = await db.catalogSubcategory.findUnique({
          where: {
            categoryId_name: {
               categoryId: categoryRecord.id,
               name: sub.subcategory
            }
          }
       });

       if (!subcatRecord) {
         subcatRecord = await db.catalogSubcategory.create({
            data: {
               name: sub.subcategory,
               categoryId: categoryRecord.id
            }
         });
       }

       // Mapear relacionamentos da subcategoria para os itens
       const updateSubResult = await db.commercialItem.updateMany({
         where: { 
            category: cat.category,
            subcategory: sub.subcategory
         },
         data: { catalogSubcategoryId: subcatRecord.id }
       });
       
       console.log(`    ↳ Subcategoria [${sub.subcategory}] migrada. (${updateSubResult.count} itens linkados)`);
    }
  }
  
  console.log("Migração concluída com segurança. Todos os produtos foram mapeados com Foreign Keys.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
