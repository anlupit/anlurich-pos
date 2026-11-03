# Quick Start Guide

## 1. Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Supabase / Neon account)

## 2. Setup
```bash
cd anlurich-pos
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npx prisma generate
npx prisma migrate dev --name init
# Optional: run seed
psql $DATABASE_URL -f prisma/seed.sql
```

## 3. Create First Super Admin
Use Prisma Studio (`npx prisma studio`) or create via code to insert a SUPER_ADMIN user.

## 4. Run
```bash
npm run dev
```

## Next Development Steps
1. Implement Auth (login with email + password, attach role + branchId to session)
2. Build POS interface (product search by barcode/SKU/name, cart, checkout)
3. Inventory dashboard (low stock, adjustments)
4. Purchase invoice entry form
5. Reports (sales by date, inventory valuation)
6. Receipt printing component
7. Barcode scanner integration (camera or hardware)

## Recommended UI Libraries
- shadcn/ui (https://ui.shadcn.com)
- TanStack Table for data grids
- Recharts for reports

## Cloud Deployment
- **Database**: Supabase (easiest) or Neon
- **App**: Vercel (connect GitHub repo)
- Enable Row Level Security policies in PostgreSQL for extra safety
