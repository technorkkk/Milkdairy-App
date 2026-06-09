# DAIRY LEDGER MASTER AI PROMPT: HIGH-FIDELITY PWA PRODUCTION SPECIFICATION

Use the following detailed specification to generate a robust, fully fledged, multi-tenant milk delivery and customer bookkeeping ledger dashboard.

---

## 1. VISION & CORE TARGET AUDIENCE
*   **Target User:** Dairy farm owners, local milk deliverers, and milk distributors operating in rural, semi-urban, or urban regions.
*   **Critical Need:** Rural or semi-urban areas experience weak and intermittent cellular networks. System must be designed for **100% stable offline utilization**, immediate response times (such as direct-toggle item card selection in the daily deliverable board), and absolute transaction ledger accuracy (no calculation discrepancies).
*   **Operational Models:**
    *   **Prepaid (Wallet Accounts):** Customers deposit money upfront; daily deliveries deduct balance automatically from their wallet space.
    *   **Postpaid (Outstanding Accounts):** Customers receive milk throughout the month; they clear accumulated dues at cyclic billing intervals.

---

## 2. PRODUCTION TECH STACK & ARCHITECTURE

The application must be implemented with modern code structures, avoiding hallucinated packages or empty mocks:

*   **Frontend Web Framework:** Next.js 15 (utilizing App Router layout structures) with strict TypeScript type-safety constraints. (NOT Vite).
*   **Database & Auth Provider:** Supabase. Integrate the Supabase JS Client for queries, user signups, and email/password authentications.
*   **Offline Cache Engine / Client State:** Zustand with the `persist` middleware, storing data in client's local indexedDB or localStorage, keeping a sync queue of offline operations to replay when connection returns.
*   **Layout & Look-and-Feel:** Tailwind CSS, Shadcn UI component styles, Lucide-react icons, and lightweight Framer Motion transitions.
*   **Forms & Validation:** React Hook Form bound with Zod schemas.
*   **Interactive Calendars:** Fluid layout grids capturing monthly calendar grids displaying daily milk distribution quotas and payment indicators.
*   **Receipt Compiling:** `pdf-lib` for lightning-fast client-side on-the-fly PDF invoice builds.

---

## 3. SUPABASE ACCESS CREDENTIALS
You MUST configure the client initialization layer to point to the following credentials:
```env
NEXT_PUBLIC_SUPABASE_URL="https://xhvluvhslwolykbpdifs.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhodmx1dmhzbHdvbHlrYnBkaWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTM0NDUsImV4cCI6MjA5NDU4OTQ0NX0.sxBNGJ4ZPiSvKxWo5oDW9vFrbNCuCY97HNQysfMUnJI"
```

---

## 4. MULTI-TENANT SECURE RELATIONAL DB SCHEMA (POSTGRESQL)

Run this SQL block in the Supabase query editor to construct and secure the multi-tenant architecture. All rules utilize Row Level Security (RLS) policies confirming that any data read or write validates against the active logged-in user (`auth.uid()::text = user_id`).

```sql
-- =========================================================================
-- 1. BUSINESS PROFILES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  dairy_name TEXT,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 2. CUSTOMERS (Supports Soft-Delete and strict Constraints)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  daily_quantity DECIMAL DEFAULT 1.0 CHECK (daily_quantity >= 0),
  milk_type TEXT DEFAULT 'Cow' CHECK (milk_type IN ('Cow', 'Buffalo', 'Mixed')),
  delivery_schedule TEXT DEFAULT 'both' CHECK (delivery_schedule IN ('morning', 'evening', 'both')),
  is_active BOOLEAN DEFAULT true,
  billing_model TEXT DEFAULT 'postpaid' CHECK (billing_model IN ('prepaid', 'postpaid')),
  total_outstanding DECIMAL DEFAULT 0 CHECK (total_outstanding >= 0),
  wallet_balance DECIMAL DEFAULT 0 CHECK (wallet_balance >= 0),
  start_date DATE DEFAULT CURRENT_DATE,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 3. MILK RATES / PRICES SETUP
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.milk_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Cow', 'Buffalo', 'Mixed')),
  price_per_liter DECIMAL NOT NULL CHECK (price_per_liter > 0),
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 4. DAILY DELIVERIES LOG
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity DECIMAL NOT NULL CHECK (quantity >= 0),
  price_at_time DECIMAL NOT NULL CHECK (price_at_time >= 0),
  time TEXT DEFAULT 'morning' CHECK (time IN ('morning', 'evening')),
  type TEXT DEFAULT 'Regular' CHECK (type IN ('Regular', 'Initial Dues', 'Adjustment dues', 'Adjustment wallet debit', 'Extra')),
  delivered BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 5. PAYMENT TRANSACTIONS LEDGER
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL CHECK (amount >= 0),
  date TIMESTAMPTZ DEFAULT now(),
  mode TEXT DEFAULT 'Cash' CHECK (mode IN ('Cash', 'UPI', 'Bank Transfer', 'Initial Deposit', 'Adjustment wallet credit', 'Adjustment payments')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 6. UNIFIED AUDIT LEDGER (Highly recommended for deep accounting traces)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('delivery', 'payment', 'adjustment_debit', 'adjustment_credit', 'opening_balance')),
  amount DECIMAL NOT NULL CHECK (amount >= 0),
  reference_id UUID, -- References deliveries.id or payments.id if corresponding
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 7. EXPENSE RECORDS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount DECIMAL NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL CHECK (category IN ('Chara', 'Fuel', 'Electricity', 'Staff Salary', 'Rent', 'Other')),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 8. DAIRY DAILY MILK COLLECTION & STOCK INVENTORY
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.dairy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  morning_collected DECIMAL DEFAULT 0 CHECK (morning_collected >= 0),
  evening_collected DECIMAL DEFAULT 0 CHECK (evening_collected >= 0),
  delivered DECIMAL DEFAULT 0 CHECK (delivered >= 0),
  remaining DECIMAL DEFAULT 0 CHECK (remaining >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATIONS
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dairy_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles access policy" ON public.profiles FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Customers access policy" ON public.customers FOR ALL USING (user_id = auth.uid()::text AND deleted_at IS NULL) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Milk prices access policy" ON public.milk_prices FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Deliveries access policy" ON public.deliveries FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Payments access policy" ON public.payments FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Ledger entries access policy" ON public.ledger_entries FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Expenses access policy" ON public.expenses FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Inventory access policy" ON public.dairy_inventory FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
```

---

## 5. TRANSACTIONAL CORE BALANCE RECALCULATION ENGINE (CRITICAL)

To prevent accounting discrepancies (desyncing outstanding dues or wallet credit over backfilled deliveries or edited historical numbers), the system MUST implement this mathematical ledger rebuild flow:

1.  **Starting Dues & Starting Balances as Ledger Log Items:**
    *   When creating a customer, if **Postpaid** with an *Initial Outstanding balance*, write a delivery record with `type = 'Initial Dues'`, `quantity = 1`, and `price_at_time = outstanding_amount` dated as the start date.
    *   If **Prepaid** with an *Initial Wallet balance*, write a payment record with `mode = 'Initial Deposit'` and `amount = wallet_amount` dated as the start date.
2.  **Adjusting Balances on Manual Form Edits:**
    *   If the user edits a customer's balance value inside an edit modal, calculate the change (`New Balance - Old Balance`).
    *   Add a corresponding `type = 'Adjustment dues'` delivery or a `'Adjustment wallet credit'` payment record rather than updating the raw column value directly. This guarantees the accounting remains historical.
3.  **The Pure Mathematical Recalculation Loop:**
    Whenever a delivery is logged, modified, deleted, or a payment is added, trigger this SQL function (or TypeScript query sequence) for the specific customer:
    *   `Total Deliveries Cost = SUM (deliveries.quantity * deliveries.price_at_time)`
    *   `Total Payments Amount = SUM (payments.amount)`
    *   If `billing_model = 'prepaid'`:
        *   `wallet_balance = Total Payments - Total Deliveries Cost`
        *   `total_outstanding = 0`
    *   If `billing_model = 'postpaid'`:
        *   `total_outstanding = MAX(0, Total Deliveries Cost - Total Payments)`
        *   `wallet_balance = 0`
    *   Update the `customers` record with these fresh reconciled values.

---

## 6. BUSINESS MODULE SPECS

### 6.1. Dairy Inventory Stock Module
Keep tabs of milk collected vs distributed:
*   Allows the farm owner to record daily Morning collection and Evening collection (in liters).
*   Calculates total milk sold automatically by tracking marked deliveries matching the target date.
*   Shows a visual comparison widget highlighting remaining stock or warning indicators if current deliveries exceed collected milk volumes.

### 6.2. Farm Expense Tracker
*   Tracks expenses under categories: `Chara (Fodder)`, `Fuel`, `Electricity`, `Staff Salary`, `Rent`, `Other`.
*   Shows profit margins (Gross Milk Delivery Revenue subtract Farm Expenses) in a clean analytics card on the dashboard.

### 6.3. Instant Mobile-First Delivery Logs
*   A responsive **Delivery Board** grouping customers assigned for morning, evening, or both shifts.
*   **Tactile Card Clicks:** Tapping the customer card toggles delivery status instantly with micro-animations. It removes tiny switch elements that are hard to tap for on-the-go riders.

### 6.4. Unified Customer Profiling & Calendars
*   Display a monthly calendar grid inside each customer's portal showing a 31-day agenda.
*   Display clear text badges under active squares (e.g., `1.5L C` for Cow milk deliveries, `1L D` for initial dues, etc.).
*   Include emerald dots indicating successfully marked deliveries, and amber dots signifying payment entries on specific dates.

### 6.5. PDF Billing & WhatsApp Invoicing
*   **pdf-lib compilation:** Generate on-device clean, readable client invoices complete with dairy header, items summary table, dates, ledger statements, and a signature column.
*   **WhatsApp Direct API integration:** Create rapid WhatsApp trigger links loading localized reminders. Example text:
    `Hello *{Customer Name}*, Gokul Dairy Farm bill for {Month} is ready. Total Dues: ₹{total_outstanding}. Download PDF here...`

### 6.6. Offline Sync Progressive Web App (PWA)
*   Deploy a functional `manifest.json` and a registered Workbox configuration caching standard routing steps.
*   Include an outbound local Zustand queue. When user is offline, marked deliveries are saved locally. Once internet returns, queue items automatically flush down to Supabase.

---

## 7. MVP COMPLETE SCREEN LIST
1.  **Login & Signup Portal:** Modern onboarding utilizing Supabase Auth.
2.  **Dairy Setup wizard:** Create dairy farm profile and initial cow/buffalo milk collection prices.
3.  **Active Dashboard:** Highlight today's delivery percentage, collection totals, outstanding dues, and active expense graphs.
4.  **Customer List Panel:** Easy lookup showing prepaid/postpaid status and quick edit buttons.
5.  **Add Customer Portal:** Backfill historic start dates and set up starting balances.
6.  **Customer Profile Page:** Clean 31-day visual calendar, payments overview list, and balance triggers.
7.  **Daily Delivery Hub:** Shift-wise filterable feed with instant tactile card marking toggles.
8.  **Payments Log Board:** Easy UPI/Cash payment registrations.
9.  **Audit Ledger Sheet:** Line-by-line financial statement.
10. **Milk Rate Setting screen:** Define price per liter rules.
11. **Comprehensive Reports Center:** Charts outlining gross profits, expenses, and monthly delivery cycles.
12. **Invoice Builder Modal:** Setup month filters and compiles clean PDF layouts.
13. **Settings Page:** Dark Mode, Reset Database Safeguard, and detailed Export Options.

---

## 8. BUILD AND STRUCTURAL COMMAND INSTRUCTIONS
Construct the file hierarchy in modular fashion:
*   Add TS interfaces inside `src/types.ts`.
*   Maintain database queries under a safe abstraction layer.
*   Always invoke the balance recalculation engine after ledger events to sustain absolute consistency.
