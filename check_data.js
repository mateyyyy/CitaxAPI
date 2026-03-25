const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.uSUARIO.findUnique({
      where: { email: 'admin@citax.com' },
      include: { EMPRESA: true }
    });
    console.log('User:', JSON.stringify(user, null, 2));
    
    const count = await prisma.sERVICIO.count();
    console.log('Total services:', count);

    const companies = await prisma.eMPRESA.findMany();
    console.log('Total companies:', companies.length);
    console.log('Companies:', JSON.stringify(companies, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
