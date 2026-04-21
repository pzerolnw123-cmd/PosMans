require('dotenv').config();
const { prisma } = require('./src/lib/db');

async function run() {
  const users = await prisma.user.findMany({
    include: { store: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
