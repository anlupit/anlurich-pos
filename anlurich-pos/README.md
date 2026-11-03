# Anlurich OPC Multi-Branch POS & Inventory System
## Custom Web-Based Cloud POS for Automotive Parts Retailers

**Branches:**
- Anlurich OPC (Main / Head Office)
- LIPA AUTOPARTS
- DASMA AUTO PARTS
- BALIWAG AUTO PARTS

### Architecture Overview

**Cloud-Based Multi-Branch System**
- Single shared application deployed on cloud (recommended: Vercel + Supabase/Neon PostgreSQL, or AWS)
- **Shared Master Product Catalog** across all branches
- **Private per-branch data**: Stock levels, Selling prices, Sales, Purchases, Customers (branch-specific or shared optional), Cashier sessions
- Strong data isolation via `branchId` filtering + PostgreSQL Row Level Security (RLS)
- Role-Based Access Control (RBAC)

**Tech Stack Recommendation (2026)**
- **Frontend**: Next.js 15+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes / Server Actions or NestJS
- **Database**: PostgreSQL (Supabase or Neon recommended for easy cloud + Auth + RLS)
- **ORM**: Prisma
- **Auth**: Supabase Auth or NextAuth.js with JWT (branch + role in claims)
- **Payments**: Stripe, PayMongo (PH), or local providers
- **Barcode**: Browser camera + QuaggaJS / ZXing, or hardware scanners (keyboard wedge)
- **Receipts**: Browser print + thermal printer support (ESC/POS via WebUSB or print service)
- **Hosting**: Vercel (frontend) + Supabase (DB/Auth) — low cost, scalable

### User Roles (per Branch)

| Role                    | Max Concurrent | Permissions |
|-------------------------|----------------|-------------|
| **Cashier**             | 2              | POS sales, payments, receipts, view products & stock, customer lookup |
| **Inventory Encoder**   | 2              | Stock adjustments, receive goods, low stock view, product barcode assignment, view reports |
| **Purchase Invoice Recorder** | 2         | Create/edit Purchase Orders & Supplier Invoices, stock-in, supplier management |
| **Branch Admin**        | 1+             | All branch operations + user management within branch + reports |
| **Super Admin**         | Company        | Master product catalog, all branches overview, system settings, cross-branch reports |

**Login**: Each user has credentials tied to a specific branch. Cashiers/Inventory/Purchase users only see their branch data. Super Admin can switch views or see consolidated reports.

### Core Modules

1. **Authentication & Authorization**
2. **Master Product Catalog** (shared: SKU, barcode, name, description, category, brand, OEM/aftermarket, vehicle fitment optional)
3. **Branch Inventory** (qty, cost, selling price, low stock threshold, location in store)
4. **Point of Sale (POS)**
   - Fast product search (barcode, SKU, name)
   - Cart, discounts, tax
   - Multiple payment methods (Cash, Card, GCash, Maya, etc.)
   - Receipt print
   - Hold/resume transactions
5. **Purchasing & Supplier Invoices**
   - Suppliers
   - Purchase Orders → Receiving → Stock update
6. **Inventory Management**
   - Stock adjustments, cycle counts
   - Low stock alerts & reports
   - Stock movement history
7. **Customers**
   - Accounts, purchase history, credit terms (optional)
8. **Reporting & Accounting Export**
   - Daily sales, inventory valuation, purchase reports
   - Export to Excel/CSV for accounting (QuickBooks, Xero, or local)
9. **User & Branch Management**

### Recommended Additional Features for Auto Parts
- Vehicle compatibility (Make / Model / Year / Engine)
- Cross-reference part numbers
- Core charge tracking (if applicable)
- Warranty tracking

### Security & Privacy
- All transactional data scoped by `branchId`
- Users cannot access other branches' sales, purchases, or stock
- Audit logs for sensitive actions
- HTTPS only, password hashing, optional 2FA for admins

### Implementation Roadmap
1. **Phase 1 (MVP - 4-6 weeks)**: Auth, Products, Inventory, Basic POS, Purchases, Roles
2. **Phase 2**: Advanced reports, barcode camera, thermal printing, customer credit
3. **Phase 3**: Vehicle fitment, multi-warehouse, e-commerce sync, mobile app

### Deployment
- Database: Supabase (free tier to start) or Neon
- App: Vercel
- Domain: pos.anlurich.com or per-branch subdomains (optional)

---

See `prisma/schema.prisma` for the complete database design.
