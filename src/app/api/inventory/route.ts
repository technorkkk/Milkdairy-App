import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/inventory?dairyId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dairyId = searchParams.get("dairyId");

    if (!dairyId) {
      return NextResponse.json(
        { error: "dairyId query parameter is required" },
        { status: 400 }
      );
    }

    const items = await db.inventoryItem.findMany({
      where: { dairyId },
      orderBy: { name: "asc" },
    });

    // Round numeric values
    const result = items.map((item) => ({
      ...item,
      quantity: Math.round(item.quantity * 100) / 100,
      minStock: Math.round(item.minStock * 100) / 100,
      pricePerUnit: Math.round(item.pricePerUnit * 100) / 100,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

// POST /api/inventory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dairyId,
      name,
      category,
      quantity,
      unit,
      minStock,
      pricePerUnit,
      lastRestocked,
    } = body;

    if (!dairyId || !name || !category) {
      return NextResponse.json(
        { error: "dairyId, name, and category are required" },
        { status: 400 }
      );
    }

    const item = await db.inventoryItem.create({
      data: {
        dairyId,
        name,
        category,
        quantity: Math.round((quantity ?? 0) * 100) / 100,
        unit: unit || "litre",
        minStock: Math.round((minStock ?? 0) * 100) / 100,
        pricePerUnit: Math.round((pricePerUnit ?? 0) * 100) / 100,
        lastRestocked: lastRestocked ? new Date(lastRestocked) : null,
      },
    });

    return NextResponse.json({
      ...item,
      quantity: Math.round(item.quantity * 100) / 100,
      minStock: Math.round(item.minStock * 100) / 100,
      pricePerUnit: Math.round(item.pricePerUnit * 100) / 100,
    });
  } catch (error) {
    console.error("POST /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}

// PUT /api/inventory
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      dairyId,
      name,
      category,
      quantity,
      unit,
      minStock,
      pricePerUnit,
      lastRestocked,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "InventoryItem id is required" },
        { status: 400 }
      );
    }

    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (dairyId !== undefined) data.dairyId = dairyId;
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (quantity !== undefined)
      data.quantity = Math.round(quantity * 100) / 100;
    if (unit !== undefined) data.unit = unit;
    if (minStock !== undefined)
      data.minStock = Math.round(minStock * 100) / 100;
    if (pricePerUnit !== undefined)
      data.pricePerUnit = Math.round(pricePerUnit * 100) / 100;
    if (lastRestocked !== undefined)
      data.lastRestocked = lastRestocked ? new Date(lastRestocked) : null;

    const item = await db.inventoryItem.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...item,
      quantity: Math.round(item.quantity * 100) / 100,
      minStock: Math.round(item.minStock * 100) / 100,
      pricePerUnit: Math.round(item.pricePerUnit * 100) / 100,
    });
  } catch (error) {
    console.error("PUT /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory?id=...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "InventoryItem id query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    await db.inventoryItem.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
