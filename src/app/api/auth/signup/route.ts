import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingUser, error: lookupError } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('Signup lookup error:', lookupError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password using PBKDF2 (works on Node.js and Bun)
    const hashedPassword = await hashPassword(password);

    // Create user
    const { data: user, error: insertError } = await supabase
      .from('User')
      .insert({
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
      })
      .select('id, email, name, phone')
      .single();

    if (insertError) {
      console.error('Signup insert error:', insertError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
