import { NextResponse } from 'next/server';

// This endpoint has been disabled for security.
// Database migration should be done via the Supabase SQL Editor directly.
// See supabase-migration.sql for the full schema.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has been disabled. Please use the Supabase SQL Editor to run migrations manually.' },
    { status: 403 }
  );
}
