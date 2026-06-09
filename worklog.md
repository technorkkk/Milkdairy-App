---
Task ID: 1
Agent: Main Agent
Task: Fix signup "Internal server error" on Vercel deployment

Work Log:
- Analyzed user's screenshot showing "Internal server error" on signup page at day2.vercel.app
- Investigated project structure: Next.js 16 app with Prisma ORM connecting to Supabase PostgreSQL
- Tested database connectivity: Found Prisma could NOT connect to Supabase PostgreSQL (pooler returned "tenant/user not found", direct connection returned "ENETUNREACH" due to IPv6)
- Verified Supabase REST API works perfectly via JS client (tested insert/select/delete operations)
- Root cause: Prisma's direct PostgreSQL connection fails from both this server and Vercel, but Supabase REST API works fine
- Also identified: Bun.password.hash used in signup/login routes doesn't work on Vercel (Node.js runtime)

Fix Applied:
1. Created `/src/lib/password.ts` - PBKDF2 password hashing using Web Crypto API (works on both Node.js and Bun)
2. Updated `/src/lib/supabase.ts` - Proper Supabase client for server-side API routes
3. Rewrote ALL API routes from Prisma to Supabase JS client:
   - `/api/auth/signup/route.ts` - Uses supabase.from('User') + PBKDF2 hashing
   - `/api/auth/login/route.ts` - Uses supabase.from('User') + PBKDF2 verification (with legacy SHA-256 fallback)
   - `/api/dairy/route.ts` - Full CRUD using supabase client
   - `/api/customers/route.ts` - Full CRUD with balance recalculation
   - `/api/deliveries/route.ts` - Full CRUD with bulk creation and balance recalculation
   - `/api/payments/route.ts` - Full CRUD with balance recalculation
   - `/api/expenses/route.ts` - Full CRUD
   - `/api/inventory/route.ts` - Full CRUD
   - `/api/milk-rates/route.ts` - Full CRUD
   - `/api/audit/route.ts` - Read with filtering
   - `/api/invoices/generate/route.ts` - No changes needed (uses pdf-lib, no DB)

Testing Results:
- ✅ Signup creates user successfully
- ✅ Login works with correct password
- ✅ Wrong password is rejected
- ✅ Duplicate email returns 409 error
- ✅ Dairy creation works
- ✅ Build compiles successfully

Stage Summary:
- All 10 API routes migrated from Prisma to Supabase JS client
- Password hashing changed from Bun.password to PBKDF2 (Web Crypto API) for Vercel compatibility
- App builds successfully and all tested endpoints work correctly
