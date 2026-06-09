import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side Supabase client for API routes
// Uses the anon key with permissive RLS policies
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
