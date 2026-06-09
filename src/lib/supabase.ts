import { createClient } from '@supabase/supabase-js'

// Supabase credentials - these are public (anon key is safe to expose)
// Used as fallback if env vars are not set (e.g., Vercel env not updated yet)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qrgsabeyzkcxkfeuhfuy.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZ3NhYmV5emtjeGtmZXVoZnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Nzc1OTksImV4cCI6MjA5NjU1MzU5OX0.JNcrh_SHtJS-WATk6tS4JOvOd8B4pnR_7LZJfGiRWPE'

// Server-side Supabase client for API routes
// Uses the anon key with permissive RLS policies
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
