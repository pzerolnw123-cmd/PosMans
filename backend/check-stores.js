require('dotenv').config();
const { prisma } = require("./src/lib/db");

async function checkStores() {
  try {
    const products = await prisma.product.findMany({
      include: { store: true }
    });
    console.log("Database Reality Check:");
    products.forEach(p => {
      console.log(`- [Store: ${p.store.slug} (${p.storeId})] [${p.category}] ${p.code}: ${p.name}`);
    });

    const stores = await prisma.store.findMany();
    console.log("\nAll Stores in System:");
    stores.forEach(s => console.log(`- ${s.slug} (ID: ${s.id})`));
    
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStores();
