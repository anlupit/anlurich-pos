// Example Role Permissions Matrix
// Use this in your auth middleware

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'], // all access
  BRANCH_ADMIN: [
    'pos:create',
    'inventory:manage',
    'purchase:manage',
    'customer:manage',
    'report:view',
    'user:manage-branch',
  ],
  CASHIER: [
    'pos:create',
    'product:view',
    'inventory:view',
    'customer:view',
    'sale:view-own',
  ],
  INVENTORY_ENCODER: [
    'inventory:manage',
    'product:view',
    'stock:adjust',
    'report:inventory',
  ],
  PURCHASE_RECORDER: [
    'purchase:create',
    'purchase:manage',
    'supplier:manage',
    'inventory:receive',
    'product:view',
  ],
} as const;

export type Role = keyof typeof ROLE_PERMISSIONS;

// Middleware example (pseudo)
// After login, attach user.role and user.branchId to request
// Then check permission before any write operation
// Always filter queries: where: { branchId: user.branchId } unless SUPER_ADMIN
