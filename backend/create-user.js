require('dotenv').config();
const { prisma } = require('./src/lib/db');
const { hashPassword } = require('./src/utils/password');

async function createOwnerWithStore() {
  try {
    const username = 'loveptn001';
    const password = 'loveptn123';
    const passwordHash = await hashPassword(password);
    const storeSlug = `${username}-test-store`;

    // Create a standalone store so login succeeds
    const store = await prisma.store.upsert({
      where: { slug: storeSlug },
      update: {
        name: `Shop ${username}`,
        isActive: true
      },
      create: {
        slug: storeSlug,
        name: `Shop ${username}`,
        isActive: true
      }
    });

    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash,
        displayName: username,
        storeRole: 'OWNER',
        storeId: store.id
      },
      create: {
        username,
        displayName: username,
        passwordHash: passwordHash,
        storeRole: 'OWNER',
        storeId: store.id
      }
    });

    console.log('✅ Success! User linked to a store for login:');
    console.log('Username:', user.username);
    console.log('Store Slug:', store.slug);
    console.log('Now you can login at http://localhost:3000/login');
  } catch (err) {
    console.error('❌ Failed to create user with store:', err);
  } finally {
    await prisma.$disconnect();
  }
}

createOwnerWithStore();
