import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const dairies = await db.dairy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Return the first (most recent) dairy as "dairy" for client compatibility
    const dairy = dairies.length > 0 ? dairies[0] : null;
    return NextResponse.json({ dairy, dairies });
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
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const dairy = await db.dairy.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        ownerName,
        userId,
      },
    });

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
    const existing = await db.dairy.findUnique({
      where: { id },
    });

    if (!existing) {
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

    const dairy = await db.dairy.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ dairy });
  } catch (error) {
    console.error('Update dairy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
