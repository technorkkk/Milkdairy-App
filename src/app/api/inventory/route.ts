import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    const { data: items, error } = await supabase
      .from("InventoryItem")
      .select("*")
      .eq("dairyId", dairyId)
      .order("name", { ascending: true });

    if (error) {
      console.error("GET /api/inventory error:", error);
      return NextResponse.json(
        { error: "Failed to fetch inventory items" },
        { status: 500 }
      );
    }

    // Round numeric values
    const result = (items || []).map((item) => ({
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

    const { data: item, error: insertError } = await supabase
      .from("InventoryItem")
      .insert({
        dairyId,
        name,
        category,
        quantity: Math.round((quantity ?? 0) * 100) / 100,
        unit: unit || "litre",
        minStock: Math.round((minStock ?? 0) * 100) / 100,
        pricePerUnit: Math.round((pricePerUnit ?? 0) * 100) / 100,
        lastRestocked: lastRestocked ? new Date(lastRestocked).toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/inventory error:", insertError);
      return NextResponse.json(
        { error: "Failed to create inventory item" },
        { status: 500 }
      );
    }

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

    const { data: existing, error: lookupError } = await supabase
      .from("InventoryItem")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) { console.error("PUT /api/inventory: error fetching inventory item", lookupError); }

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
      data.lastRestocked = lastRestocked ? new Date(lastRestocked).toISOString() : null;

    const { data: item, error: updateError } = await supabase
      .from("InventoryItem")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("PUT /api/inventory error:", updateError);
      return NextResponse.json(
        { error: "Failed to update inventory item" },
        { status: 500 }
      );
    }

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

    const { data: existing, error: lookupError } = await supabase
      .from("InventoryItem")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) { console.error("DELETE /api/inventory: error fetching inventory item", lookupError); }

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("InventoryItem")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DELETE /api/inventory error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete inventory item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/inventory error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
