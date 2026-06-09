---
Task ID: 2
Agent: Main Agent
Task: Fix Add Customer page overlap, add Quantity Change with effective date, add Past Entry mode with absent date multi-select

Work Log:
- Fixed Add Customer Sheet layout: changed from max-h-[60vh] ScrollArea with SheetFooter overlap to flex-column layout (h-[92vh] flex flex-col) with fixed header/tabs/footer and scrollable content area
- Added two-tab Add Customer: "New Customer" (normal) and "Past Entry" (for missed entries with start date and absent date selection)
- Created AbsentDateCalendar component with multi-select date toggling (green=delivered, red=absent) and month navigation
- Added Past Entry summary box showing total days, absent days, and delivery entries to create count
- Added info banner explaining Past Entry mode for dairy owners
- Added Quantity Change tracking in EditCustomerDialog: when defaultQuantity changes, an amber checkbox appears to track the change with an effective date
- Added QuantityHistory model to Prisma schema with customerId, quantity, previousQuantity, effectiveFrom fields
- Updated Customer API (PUT) to handle quantityEffectiveFrom field and create QuantityHistory + LedgerEvent records
- Added bulk delivery creation API endpoint (POST /api/deliveries with action: "bulk") for past entries
- Added bulkCreateDeliveries method to delivery store
- Pushed Prisma schema changes (new QuantityHistory model) to SQLite database
- Added daily quantity display (X L/day) to CustomerCard badges
- Build verified successfully with no errors

Stage Summary:
- Add Customer Sheet no longer has overlap issues (fixed footer, scrollable content)
- Two Add Customer modes: Normal and Past Entry with absent date multi-select calendar
- Quantity change tracking with effective date in Edit Customer dialog
- Bulk delivery creation API for past entries
- QuantityHistory model tracks all quantity changes for audit trail

---
Task ID: 2
Agent: Feature Agent
Task: Enhance Customer Detail View with Monthly Summary, Share Bill Dialog, and Bill Message Format

Work Log:
- Added new lucide icon imports: Share2, Droplets, Calendar, Send, MessageSquare, Copy, Check
- Added endOfMonth import from date-fns
- Created ShareBillDialog component with date range selector, bill preview, Web Share API, clipboard copy, and WhatsApp share
- ShareBillDialog generates formatted Hindi-English bill message with dairy name, customer details, delivery stats, payment info, and balance
- WhatsApp share cleans phone number (removes spaces, adds country code 91 if needed) and opens wa.me link
- Added monthlyStats useMemo computation in CustomerDetailView filtering deliveries/payments by current calendar month
- Added Monthly Summary Card between Balance Card and Delivery Calendar with 2x2 grid of stats (Total Liters, Delivery Amount, Payments, Net Balance)
- Each stat has colored icon, label, and value with appropriate color coding (red for due, green for surplus)
- Added shareBillDialogOpen state and Share Bill button (green, full-width, with Share2 icon) below calendar card
- Wired ShareBillDialog rendering at bottom of CustomerDetailView with customer, deliveries, payments, and calendarMonth props
- Build verified successfully with no errors

Stage Summary:
- Monthly Summary Card shows liters, amount, payments, and net balance for current calendar month
- Share Bill button opens ShareBillDialog with date range selector and bill preview
- Bill message uses Hindi-English format with dairy name, customer info, delivery stats, and balance
- Web Share API with clipboard fallback for sharing; WhatsApp button for direct messaging
- All new features added to existing file without modifying stores, API routes, or other components

---
Task ID: 3
Agent: Billing Cycle Agent
Task: Implement custom billing cycles based on customer start date and carry-forward outstanding tracking

Work Log:
- Added billing cycle utility functions: getBillingCycle(), getNextBillingCycle(), getPrevBillingCycle(), getDatesInRange(), calculateCarryForward()
- Billing cycles are calculated from customer's createdAt date (e.g., start on 5th → cycles: 5 May-4 Jun, 5 Jun-4 Jul)
- Replaced calendarMonth state with billingCycle state (start/end dates) + React-recommended render-time state sync pattern
- Replaced prevMonth/nextMonth navigation with prevCycle/nextCycle navigation bounded by customer start date and today
- Replaced calendarDates (getDatesInMonth) with billing-cycle-aware getDatesInRange for the calendar grid
- Replaced monthlyStats with cycleStats that includes carryForward from previous billing cycles
- calculateCarryForward() computes outstanding from all deliveries/payments BEFORE current cycle start, accounting for postpaid vs prepaid billing types
- Updated data fetching from single-month range to 12-month range to support carry-forward calculations
- Updated Calendar UI header to show "Billing: 5 Mar - 4 Apr 2026" format instead of "Mar 2026"
- Calendar grid now uses billing cycle start date for first-day offset instead of month start
- CalendarCell prop renamed from isCurrentMonth to isInCycle (all cycle dates pass true)
- Added Info icon import from lucide-react for carry-forward indicator
- Replaced Monthly Summary card with Billing Cycle Summary card showing: Total Liters, Current Period Amount, Payments, Total Outstanding
- Added carry-forward row with amber/red styling, Info icon, and "Pichle period ka baki" (previous period's due) label when carry-forward > 0
- Added "Bill Ready" green indicator banner when a billing cycle has completed (end date before today) with "Share Now" button
- Updated ShareBillDialog props from calendarMonth to billingCycle + cycleStats
- ShareBillDialog date range now defaults to billing cycle start/end
- Bill message now includes: Billing Period, Customer Since date, This Period amount, Previous Carry-Forward (if > 0), Total Bill, Payments Done, Balance Due
- Fixed lint errors: replaced useEffect-based setState with React-recommended render-time state sync pattern for both billing cycle init and dialog reset
- Build verified successfully with no errors

Stage Summary:
- Custom billing cycles based on customer start date replace calendar month cycles
- Carry-forward outstanding from previous cycles tracked and displayed with amber/red indicator
- Billing cycle navigation (prev/next) bounded by customer start date and today
- Bill Ready indicator shown for completed billing cycles with Share Now button
- Share Bill dialog updated with carry-forward, billing period, and customer-since info
- Data fetching expanded to 12-month range for accurate carry-forward calculations
- All existing functionality preserved (payment dialog, edit dialog, ledger tab, etc.)

---
Task ID: 4
Agent: Main Agent
Task: Fix calendar to show from customer's actual start date, implement startDate field, retain 5 months of historical data

Work Log:
- ROOT CAUSE IDENTIFIED: Billing cycle used `customer.createdAt` (system creation timestamp) instead of customer's actual service start date. Customer added via "Past Entry" starting May 25 had `createdAt = June 8`, causing calendar to show from June 8 instead of May 25.
- Added `startDate` field to Prisma Customer model (optional String, stores YYYY-MM-DD)
- Ran Prisma migration (db push) to add the field to SQLite database
- Added `startDate` to Customer interface in customer-store.ts
- Added `startDate` to customerSchema in validators.ts (optional string)
- Updated API route POST /api/customers to accept and store `startDate`
- Updated API route PUT /api/customers to handle `startDate` updates
- Created `getCustomerStartDate(customer)` helper in customer-detail-view.tsx: returns `customer.startDate || customer.createdAt`
- Replaced ALL 9 occurrences of `customer.createdAt` in billing cycle calculations with `getCustomerStartDate(customer)`
- Updated AddCustomerForm: for new customers `startDate = today`, for past entry `startDate = pastStartDate`
- Added "Start Date (Billing Cycle)" field to EditCustomerDialog with Hindi description
- Added "Customer Since" badge in customer detail header showing the start date with calendar icon
- Updated billing cycle list from 6 to 5 months of history
- Updated month-wise navigation buttons to show full range "25 May - 24 Jun" instead of just "25 May"
- Removed unnecessary "Cycle in progress" indicator from calendar
- Migrated existing customer data: set startDate based on first delivery date (Ajit = 2026-05-25, Vivek Sah = 2026-05-19)
- Build verified successfully

Stage Summary:
- Calendar now correctly shows billing cycle from customer's ACTUAL start date (not system creation date)
- Example: Ajit started May 25 → calendar shows May 25 - June 24, next cycle starts June 25
- Each customer gets their own billing cycle based on their `startDate`
- Previous 5 months of data retained with month-wise quick navigation buttons showing full date ranges
- `startDate` field editable via Edit Customer dialog
- Removed clutter from UI (cycle-in-progress indicator removed)

---
Task ID: 1
Agent: main
Task: Fix calendar billing period and add Start Date field

Work Log:
- Added `newStartDate` state to AddCustomerForm in customer-list-view.tsx, initialized to today via `formatDateForInput()`
- Added Start Date input field to "New Customer" tab (after Opening Balance, before Past Entry section) with Hinglish description: "Is date se billing cycle calculate hoga. Example: 25 May se start = 25 May - 24 June."
- Updated `onSubmit` in AddCustomerForm to use `newStartDate` instead of `formatDateForInput()` for "new" mode, so customers added via "New Customer" tab can have a custom start date
- Added `newStartDate` reset to `resetAndClose` callback
- Removed Balance Card (big card showing Wallet Balance / Total Outstanding with icon) from customer-detail-view.tsx — redundant since billing cycle summary shows same info
- Simplified billing cycle summary: replaced the big "Total Bakaya (Outstanding)" row with a compact "Net Balance" line (separator + simple flex row)
- Removed Ledger tab from tabbed sections (calendar IS the ledger), changed tab grid from 3 columns to 2 columns (Deliveries + Payments only)
- Cleaned up unused code: removed `BookOpen` and `Wallet` imports, `LedgerEvent` interface, `ledgerEvents` useMemo, `balance` and `isPositiveBalance` variables
- Verified billing cycle navigation works properly: prev/next buttons + month-wise quick navigation pills (5 cycles = current + 4 past)
- Lint check passed with no new errors (only pre-existing issues remain)
- Dev server compiles without errors

Stage Summary:
- "New Customer" tab now has a Start Date field (defaults to today, editable) — fixes the critical issue where billing cycle showed from today instead of the customer's actual start date
- Balance Card removed from detail view (redundant with billing cycle summary)
- Billing cycle summary simplified: compact Net Balance line replaces large Outstanding row
- Ledger tab removed (calendar serves as the visual ledger)
- All existing functionality preserved (billing cycle nav, Share Bill, Add Payment, Edit Customer, etc.)
