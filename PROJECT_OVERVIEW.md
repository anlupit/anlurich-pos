# Anlurich POS — Project Files Overview

## Key Files Created

| File | Purpose |
|------|---------|
| `README.md` | Full system design & architecture |
| `prisma/schema.prisma` | Complete database schema (shared products + private branch data) |
| `prisma/seed.sql` | Branch seed data |
| `package.json` | Dependencies (Next.js + Prisma) |
| `SETUP.md` | How to set up and run |
| `src/lib/permissions.ts` | Role permission matrix |
| `src/app/pos/page.tsx` | Starter POS cashier interface |

## How to Use This Starter

1. Download / copy the `anlurich-pos` folder
2. Follow `SETUP.md`
3. Build on top of the schema and POS page

## Next Recommended Features to Implement

- [ ] Login page with branch-aware authentication
- [ ] Real product search from database
- [ ] Stock deduction on sale
- [ ] Purchase invoice form
- [ ] Low stock dashboard
- [ ] Daily sales report
- [ ] Receipt PDF / thermal print

Would you like me to expand any specific part next (e.g. full Auth flow, Purchase module, Reports, or vehicle fitment fields)?
