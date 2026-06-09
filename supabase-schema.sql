-- MilkDairy App - Database Schema for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xhvluvhslwolykbpdifs/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('u') || REPLACE(gen_random_uuid()::text, '-', '')),
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dairy table
CREATE TABLE "Dairy" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('d') || REPLACE(gen_random_uuid()::text, '-', '')),
  "name" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "ownerName" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer table
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('c') || REPLACE(gen_random_uuid()::text, '-', '')),
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "billingType" TEXT NOT NULL DEFAULT 'postpaid',
  "milkType" TEXT NOT NULL DEFAULT 'cow',
  "defaultQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shift" TEXT NOT NULL DEFAULT 'morning',
  "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalOutstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TEXT,
  "dairyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- MilkRate table
CREATE TABLE "MilkRate" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('m') || REPLACE(gen_random_uuid()::text, '-', '')),
  "milkType" TEXT NOT NULL,
  "pricePerL" DOUBLE PRECISION NOT NULL,
  "shift" TEXT NOT NULL DEFAULT 'morning',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dairyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Delivery table
CREATE TABLE "Delivery" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('d') || REPLACE(gen_random_uuid()::text, '-', '')),
  "customerId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "shift" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "milkType" TEXT NOT NULL,
  "pricePerL" DOUBLE PRECISION NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'delivered',
  "notes" TEXT,
  "synced" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment table
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('p') || REPLACE(gen_random_uuid()::text, '-', '')),
  "customerId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "paymentMode" TEXT NOT NULL DEFAULT 'cash',
  "date" TEXT NOT NULL,
  "notes" TEXT,
  "receiptNo" TEXT,
  "synced" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Expense table
CREATE TABLE "Expense" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('e') || REPLACE(gen_random_uuid()::text, '-', '')),
  "dairyId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "date" TEXT NOT NULL,
  "synced" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- InventoryItem table
CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('i') || REPLACE(gen_random_uuid()::text, '-', '')),
  "dairyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'litre',
  "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pricePerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastRestocked" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- LedgerEvent table
CREATE TABLE "LedgerEvent" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('l') || REPLACE(gen_random_uuid()::text, '-', '')),
  "customerId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "referenceId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "balanceAfter" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "date" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- QuantityHistory table
CREATE TABLE "QuantityHistory" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('q') || REPLACE(gen_random_uuid()::text, '-', '')),
  "customerId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "previousQuantity" DOUBLE PRECISION NOT NULL,
  "effectiveFrom" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AuditLog table
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('a') || REPLACE(gen_random_uuid()::text, '-', '')),
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "details" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SyncQueue table
CREATE TABLE "SyncQueue" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT (LOWER('s') || REPLACE(gen_random_uuid()::text, '-', '')),
  "operation" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttempt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "error" TEXT
);

-- Foreign Keys
ALTER TABLE "Dairy" ADD CONSTRAINT "Dairy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilkRate" ADD CONSTRAINT "MilkRate_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuantityHistory" ADD CONSTRAINT "QuantityHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for better query performance
CREATE INDEX "Dairy_userId_idx" ON "Dairy"("userId");
CREATE INDEX "Customer_dairyId_idx" ON "Customer"("dairyId");
CREATE INDEX "MilkRate_dairyId_idx" ON "MilkRate"("dairyId");
CREATE INDEX "Delivery_customerId_date_idx" ON "Delivery"("customerId", "date");
CREATE INDEX "Delivery_date_idx" ON "Delivery"("date");
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");
CREATE INDEX "Expense_dairyId_idx" ON "Expense"("dairyId");
CREATE INDEX "InventoryItem_dairyId_idx" ON "InventoryItem"("dairyId");
CREATE INDEX "LedgerEvent_customerId_idx" ON "LedgerEvent"("customerId");
CREATE INDEX "QuantityHistory_customerId_idx" ON "QuantityHistory"("customerId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "SyncQueue_status_idx" ON "SyncQueue"("status");

-- Disable RLS for now (API handles auth)
-- You can enable RLS later for production security
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

-- Allow all operations for anon and authenticated users (for now)
-- In production, replace these with more restrictive policies
CREATE POLICY "Allow all on User" ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on Dairy" ON "Dairy" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on Customer" ON "Customer" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on MilkRate" ON "MilkRate" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on Delivery" ON "Delivery" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on Payment" ON "Payment" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on Expense" ON "Expense" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on InventoryItem" ON "InventoryItem" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on LedgerEvent" ON "LedgerEvent" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on QuantityHistory" ON "QuantityHistory" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on AuditLog" ON "AuditLog" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on SyncQueue" ON "SyncQueue" FOR ALL USING (true) WITH CHECK (true);
