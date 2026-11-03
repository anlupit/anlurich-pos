import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(req: Request) {
  const branch = new URL(req.url).searchParams.get('branch') || '';
  const sales = await prisma.sale.findMany({
    where: branch && branch !== 'admin' ? { branch: { code: branch } } : {},
    include: { items: { include: { product: true } }, payments: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const body = await req.json();
  const branch = await prisma.branch.upsert({
    where: { code: body.branch || 'anlurich' },
    update: {},
    create: { code: body.branch || 'anlurich', name: body.branch || 'ANLURICH' },
  });
  const sale = await prisma.sale.create({
    data: {
      saleNumber: body.invoiceNo || `${branch.code}-${Date.now()}`,
      branchId: branch.id,
      subtotal: body.subtotal || 0,
      discount: body.discount || 0,
      total: body.total || 0,
      notes: body.customerName || null,
      items: {
        create: await Promise.all((body.items || []).map(async (item: any) => {
          const product = await prisma.product.upsert({
            where: { partNumber: item.partNumber || 'UNKNOWN' },
            update: {},
            create: { partNumber: item.partNumber || 'UNKNOWN', name: item.description || item.partNumber || 'Item' },
          });
          return {
            productId: product.id,
            quantity: item.qty || 1,
            unitPrice: item.price || 0,
            total: item.total || 0,
          };
        })),
      },
      payments: {
        create: [{ method: 'CASH', amount: body.total || 0, reference: body.paymentMethod || 'Cash' }],
      },
    },
  });
  return NextResponse.json(sale);
}
