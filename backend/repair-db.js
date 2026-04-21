require('dotenv').config();
const { prisma } = require("./src/lib/db");

async function repair() {
  try {
    // 1. แก้ไขสถานะสินค้าให้เป็นค่าพื้นฐานที่ระบบรองรับ (ป้องกัน Error 400)
    // 2. ปรับรหัสสินค้าที่ผิดหมวดให้ถูกต้อง (ป้องกัน Error 409)
    const salim = await prisma.product.findFirst({
      where: { name: "สลิ่มกะทิสด" }
    });

    if (salim) {
      console.log("Repairing 'สลิ่มกะทิสด'...");
      await prisma.product.update({
        where: { id: salim.id },
        data: { 
          code: "DESSERT-002", // ย้ายรหัส FOOD-001 ออกไปเพื่อให้หมวดอาหารว่าง
          status: "พร้อมขาย"
        }
      });
      console.log("Done!");
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

repair();
