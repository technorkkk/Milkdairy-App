import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/dairy?userId=xxx — Get dairies for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { data: dairies, error: dairyError } = await supabase
      .from('Dairy')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (dairyError) {
      console.error('Get dairies error:', dairyError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Return the first (most recent) dairy as "dairy" for client compatibility
    const dairy = dairies && dairies.length > 0 ? dairies[0] : null;
    return NextResponse.json({ dairy, dairies: dairies || [] });
  } catch (error) {
    console.error('Get dairies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/dairy — Create a new dairy
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address, phone, ownerName, userId } = body;

    // Validate required fields
    if (!name || !ownerName || !userId) {
      return NextResponse.json(
        { error: 'Name, ownerName, and userId are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { data: dairy, error: insertError } = await supabase
      .from('Dairy')
      .insert({
        name,
        address: address || null,
        phone: phone || null,
        ownerName,
        userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create dairy error:', insertError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ dairy }, { status: 201 });
  } catch (error) {
    console.error('Create dairy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/dairy — Update an existing dairy
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, address, phone, ownerName } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Dairy id is required' },
        { status: 400 }
      );
    }

    // Verify dairy exists
    const { data: existing, error: lookupError } = await supabase
      .from('Dairy')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (lookupError || !existing) {
      return NextResponse.json(
        { error: 'Dairy not found' },
        { status: 404 }
      );
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (ownerName !== undefined) updateData.ownerName = ownerName;

    const { data: dairy, error: updateError } = await supabase
      .from('Dairy')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update dairy error:', updateError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ dairy });
  } catch (error) {
    console.error('Update dairy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
