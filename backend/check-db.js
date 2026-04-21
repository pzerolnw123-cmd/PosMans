require('dotenv').config();
const { prisma } = require("./src/lib/db");

async function checkCodes() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, code: true, name: true, category: true },
      orderBy: { code: 'asc' }
    });
    console.log("Current Products in DB:");
    products.forEach(p => console.log(`- [${p.category}] ${p.code}: ${p.name} (ID: ${p.id})`));
    
    const categories = ["อาหาร", "เครื่องดื่ม", "ของหวาน/ขนม", "รองเท้า", "อะไหล่ / อุปกรณ์เสริม"];
    for (const cat of categories) {
      const prefix = getPrefix(cat);
      // ลองรัน Query เดียวกับในตัว App
      const startPos = prefix.length + 2;
      const rows = await prisma.$queryRawUnsafe(`
        SELECT MAX(
          CASE
            WHEN substring("code" from ${startPos}) ~ '^[0-9]+$'
              THEN CAST(substring("code" from ${startPos}) AS INTEGER)
            ELSE 0
          END
        ) AS "maxCode"
        FROM "Product"
        WHERE "code" LIKE '${prefix}-%'
      `);
      console.log(`Category: ${cat} (${prefix}), startPos: ${startPos}, Calculated Max Code:`, rows[0].maxCode);
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

function getPrefix(category) {
  switch (category) {
    case "อาหาร": return "FOOD";
    case "เครื่องดื่ม": return "DRINK";
    case "ของหวาน/ขนม": return "DESSERT";
    case "รองเท้า": return "SHOE";
    case "อะไหล่ / อุปกรณ์เสริม": return "PART";
    default: return "ITEM";
  }
}

checkCodes();
