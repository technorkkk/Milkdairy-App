import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/setup - Check if the database tables are set up correctly
export async function GET() {
  try {
    const results: Record<string, boolean> = {};
    const requiredTables = [
      'User',
      'Dairy',
      'Customer',
      'MilkRate',
      'Delivery',
      'Payment',
      'Expense',
      'InventoryItem',
      'LedgerEvent',
      'QuantityHistory',
      'AuditLog',
      'SyncQueue',
    ];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      results[table] = !error;
    }

    const allSetup = Object.values(results).every((v) => v);

    return NextResponse.json({
      setup: allSetup,
      tables: results,
      sqlEditorUrl: 'https://supabase.com/dashboard/project/qrgsabeyzkcxkfeuhfuy/sql',
      message: allSetup
        ? 'Database is set up correctly!'
        : 'Some tables are missing. Please run the schema SQL in the Supabase SQL Editor.',
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup', setup: false },
      { status: 500 }
    );
  }
}
