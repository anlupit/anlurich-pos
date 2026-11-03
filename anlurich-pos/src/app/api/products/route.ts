import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { partNumber: 'asc' } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const product = await prisma.product.upsert({
    where: { partNumber: body.partNumber },
    update: {
      name: body.name,
      barcode: body.barcode || null,
      oemPartNumber: body.oemPartNumber || null,
      brand: body.brand || null,
      description: body.description || null,
      position: body.position || null,
      yearModel: body.yearModel || null,
      photoUrl: body.photoUrl || null,
    },
    create: {
      partNumber: body.partNumber,
      name: body.name || body.partNumber,
      barcode: body.barcode || null,
      oemPartNumber: body.oemPartNumber || null,
      brand: body.brand || null,
      description: body.description || null,
      position: body.position || null,
      yearModel: body.yearModel || null,
      photoUrl: body.photoUrl || null,
    },
  });
  return NextResponse.json(product);
}
