-- ============================================
-- Dairy Management App - Database Schema
-- Supabase Project: qrgsabeyzkcxkfeuhfuy
-- ============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "phone" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. Dairy table
CREATE TABLE IF NOT EXISTS "Dairy" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "ownerName" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 3. Customer table
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "billingType" TEXT DEFAULT 'postpaid',
  "milkType" TEXT DEFAULT 'cow',
  "defaultQuantity" FLOAT DEFAULT 0,
  "shift" TEXT DEFAULT 'morning',
  "walletBalance" FLOAT DEFAULT 0,
  "totalOutstanding" FLOAT DEFAULT 0,
  "openingBalance" FLOAT DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "startDate" TEXT,
  "dairyId" TEXT NOT NULL REFERENCES "Dairy"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 4. MilkRate table
CREATE TABLE IF NOT EXISTS "MilkRate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "milkType" TEXT NOT NULL,
  "pricePerL" FLOAT NOT NULL,
  "shift" TEXT DEFAULT 'morning',
  "effectiveFrom" TIMESTAMPTZ DEFAULT now(),
  "dairyId" TEXT NOT NULL REFERENCES "Dairy"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 5. Delivery table
CREATE TABLE IF NOT EXISTS "Delivery" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  "shift" TEXT NOT NULL,
  "quantity" FLOAT NOT NULL,
  "milkType" TEXT NOT NULL,
  "pricePerL" FLOAT NOT NULL,
  "totalAmount" FLOAT NOT NULL,
  "status" TEXT DEFAULT 'delivered',
  "notes" TEXT,
  "synced" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 6. Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "amount" FLOAT NOT NULL,
  "paymentMode" TEXT DEFAULT 'cash',
  "date" TEXT NOT NULL,
  "notes" TEXT,
  "receiptNo" TEXT,
  "synced" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 7. Expense table
CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dairyId" TEXT NOT NULL REFERENCES "Dairy"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL,
  "amount" FLOAT NOT NULL,
  "description" TEXT,
  "date" TEXT NOT NULL,
  "synced" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 8. InventoryItem table
CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dairyId" TEXT NOT NULL REFERENCES "Dairy"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" FLOAT DEFAULT 0,
  "unit" TEXT DEFAULT 'litre',
  "minStock" FLOAT DEFAULT 0,
  "pricePerUnit" FLOAT DEFAULT 0,
  "lastRestocked" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 9. LedgerEvent table
CREATE TABLE IF NOT EXISTS "LedgerEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "eventType" TEXT NOT NULL,
  "referenceId" TEXT,
  "amount" FLOAT NOT NULL,
  "balanceAfter" FLOAT NOT NULL,
  "description" TEXT,
  "date" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 10. QuantityHistory table
CREATE TABLE IF NOT EXISTS "QuantityHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "quantity" FLOAT NOT NULL,
  "previousQuantity" FLOAT NOT NULL,
  "effectiveFrom" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 11. AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "details" TEXT,
  "timestamp" TIMESTAMPTZ DEFAULT now()
);

-- 12. SyncQueue table
CREATE TABLE IF NOT EXISTS "SyncQueue" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "operation" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "attempts" INT DEFAULT 0,
  "lastAttempt" TIMESTAMPTZ,
  "status" TEXT DEFAULT 'pending',
  "error" TEXT
);

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dairy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MilkRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Delivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuantityHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncQueue" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Permissive RLS policies for anon key access
-- (Allow all operations for anon and authenticated roles)
-- ============================================

-- User table policies
CREATE POLICY "Allow anon select on User" ON "User" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on User" ON "User" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on User" ON "User" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on User" ON "User" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on User" ON "User" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on User" ON "User" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on User" ON "User" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on User" ON "User" FOR DELETE TO authenticated USING (true);

-- Dairy table policies
CREATE POLICY "Allow anon select on Dairy" ON "Dairy" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on Dairy" ON "Dairy" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on Dairy" ON "Dairy" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on Dairy" ON "Dairy" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on Dairy" ON "Dairy" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on Dairy" ON "Dairy" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on Dairy" ON "Dairy" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on Dairy" ON "Dairy" FOR DELETE TO authenticated USING (true);

-- Customer table policies
CREATE POLICY "Allow anon select on Customer" ON "Customer" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on Customer" ON "Customer" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on Customer" ON "Customer" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on Customer" ON "Customer" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on Customer" ON "Customer" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on Customer" ON "Customer" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on Customer" ON "Customer" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on Customer" ON "Customer" FOR DELETE TO authenticated USING (true);

-- MilkRate table policies
CREATE POLICY "Allow anon select on MilkRate" ON "MilkRate" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on MilkRate" ON "MilkRate" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on MilkRate" ON "MilkRate" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on MilkRate" ON "MilkRate" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on MilkRate" ON "MilkRate" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on MilkRate" ON "MilkRate" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on MilkRate" ON "MilkRate" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on MilkRate" ON "MilkRate" FOR DELETE TO authenticated USING (true);

-- Delivery table policies
CREATE POLICY "Allow anon select on Delivery" ON "Delivery" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on Delivery" ON "Delivery" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on Delivery" ON "Delivery" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on Delivery" ON "Delivery" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on Delivery" ON "Delivery" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on Delivery" ON "Delivery" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on Delivery" ON "Delivery" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on Delivery" ON "Delivery" FOR DELETE TO authenticated USING (true);

-- Payment table policies
CREATE POLICY "Allow anon select on Payment" ON "Payment" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on Payment" ON "Payment" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on Payment" ON "Payment" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on Payment" ON "Payment" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on Payment" ON "Payment" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on Payment" ON "Payment" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on Payment" ON "Payment" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on Payment" ON "Payment" FOR DELETE TO authenticated USING (true);

-- Expense table policies
CREATE POLICY "Allow anon select on Expense" ON "Expense" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on Expense" ON "Expense" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on Expense" ON "Expense" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on Expense" ON "Expense" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on Expense" ON "Expense" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on Expense" ON "Expense" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on Expense" ON "Expense" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on Expense" ON "Expense" FOR DELETE TO authenticated USING (true);

-- InventoryItem table policies
CREATE POLICY "Allow anon select on InventoryItem" ON "InventoryItem" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on InventoryItem" ON "InventoryItem" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on InventoryItem" ON "InventoryItem" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on InventoryItem" ON "InventoryItem" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on InventoryItem" ON "InventoryItem" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on InventoryItem" ON "InventoryItem" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on InventoryItem" ON "InventoryItem" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on InventoryItem" ON "InventoryItem" FOR DELETE TO authenticated USING (true);

-- LedgerEvent table policies
CREATE POLICY "Allow anon select on LedgerEvent" ON "LedgerEvent" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on LedgerEvent" ON "LedgerEvent" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on LedgerEvent" ON "LedgerEvent" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on LedgerEvent" ON "LedgerEvent" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on LedgerEvent" ON "LedgerEvent" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on LedgerEvent" ON "LedgerEvent" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on LedgerEvent" ON "LedgerEvent" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on LedgerEvent" ON "LedgerEvent" FOR DELETE TO authenticated USING (true);

-- QuantityHistory table policies
CREATE POLICY "Allow anon select on QuantityHistory" ON "QuantityHistory" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on QuantityHistory" ON "QuantityHistory" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on QuantityHistory" ON "QuantityHistory" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on QuantityHistory" ON "QuantityHistory" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on QuantityHistory" ON "QuantityHistory" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on QuantityHistory" ON "QuantityHistory" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on QuantityHistory" ON "QuantityHistory" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on QuantityHistory" ON "QuantityHistory" FOR DELETE TO authenticated USING (true);

-- AuditLog table policies
CREATE POLICY "Allow anon select on AuditLog" ON "AuditLog" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on AuditLog" ON "AuditLog" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on AuditLog" ON "AuditLog" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on AuditLog" ON "AuditLog" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on AuditLog" ON "AuditLog" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on AuditLog" ON "AuditLog" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on AuditLog" ON "AuditLog" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on AuditLog" ON "AuditLog" FOR DELETE TO authenticated USING (true);

-- SyncQueue table policies
CREATE POLICY "Allow anon select on SyncQueue" ON "SyncQueue" FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on SyncQueue" ON "SyncQueue" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on SyncQueue" ON "SyncQueue" FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on SyncQueue" ON "SyncQueue" FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated select on SyncQueue" ON "SyncQueue" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on SyncQueue" ON "SyncQueue" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on SyncQueue" ON "SyncQueue" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete on SyncQueue" ON "SyncQueue" FOR DELETE TO authenticated USING (true);

-- ============================================
-- Create indexes for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dairy_userId ON "Dairy"("userId");
CREATE INDEX IF NOT EXISTS idx_customer_dairyId ON "Customer"("dairyId");
CREATE INDEX IF NOT EXISTS idx_milkrate_dairyId ON "MilkRate"("dairyId");
CREATE INDEX IF NOT EXISTS idx_delivery_customerId ON "Delivery"("customerId");
CREATE INDEX IF NOT EXISTS idx_delivery_date ON "Delivery"("date");
CREATE INDEX IF NOT EXISTS idx_payment_customerId ON "Payment"("customerId");
CREATE INDEX IF NOT EXISTS idx_payment_date ON "Payment"("date");
CREATE INDEX IF NOT EXISTS idx_expense_dairyId ON "Expense"("dairyId");
CREATE INDEX IF NOT EXISTS idx_expense_date ON "Expense"("date");
CREATE INDEX IF NOT EXISTS idx_inventory_dairyId ON "InventoryItem"("dairyId");
CREATE INDEX IF NOT EXISTS idx_ledger_customerId ON "LedgerEvent"("customerId");
CREATE INDEX IF NOT EXISTS idx_quantity_customerId ON "QuantityHistory"("customerId");
CREATE INDEX IF NOT EXISTS idx_audit_userId ON "AuditLog"("userId");
