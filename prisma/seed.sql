-- Seed data for Anlurich OPC Branches
-- Run after migrations

INSERT INTO branches (id, code, name, address, is_active, created_at, updated_at) VALUES
('cl_anlurich', 'ANLURICH', 'Anlurich OPC', 'Main Office Address', true, NOW(), NOW()),
('cl_lipa', 'LIPA', 'LIPA AUTOPARTS', 'Lipa City, Batangas', true, NOW(), NOW()),
('cl_dasma', 'DASMA', 'DASMA AUTO PARTS', 'Dasmariñas, Cavite', true, NOW(), NOW()),
('cl_baliwag', 'BALIWAG', 'BALIWAG AUTO PARTS', 'Baliwag, Bulacan', true, NOW(), NOW());

-- Example categories
INSERT INTO categories (id, name) VALUES
('cat_brakes', 'Brake System'),
('cat_engine', 'Engine Parts'),
('cat_filters', 'Filters'),
('cat_electrical', 'Electrical'),
('cat_suspension', 'Suspension & Steering'),
('cat_body', 'Body Parts'),
('cat_oils', 'Oils & Fluids');

-- Note: Create users via application (with hashed passwords)
-- Example roles: SUPER_ADMIN for Anlurich, then CASHIER / INVENTORY_ENCODER / PURCHASE_RECORDER per branch
