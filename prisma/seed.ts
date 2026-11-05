import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branches = [
    { code: 'anlurich', name: 'ANLURICH OPC' },
    { code: 'dasma', name: 'Dasma Auto Parts' },
    { code: 'sezan', name: 'Sezan' },
    { code: 'timitsu', name: 'Timitsu' },
    { code: 'avenders', name: 'Avenders' },
    { code: 'lipa', name: 'Lipa Auto Parts' },
  ];
  for (const b of branches) {
    await prisma.branch.upsert({ where: { code: b.code }, update: { name: b.name }, create: b });
  }
  console.log('Branches ready');
}

main().finally(() => prisma.$disconnect());
