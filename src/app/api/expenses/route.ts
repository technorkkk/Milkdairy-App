import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/expenses?dairyId=...&dateFrom=...&dateTo=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dairyId = searchParams.get("dairyId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!dairyId) {
      return NextResponse.json(
        { error: "dairyId query parameter is required" },
        { status: 400 }
      );
    }

    // Build query for expenses
    let query = supabase
      .from("Expense")
      .select("*")
      .eq("dairyId", dairyId)
      .order("date", { ascending: false });

    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("date", dateTo);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error("GET /api/expenses error:", error);
      return NextResponse.json(
        { error: "Failed to fetch expenses" },
        { status: 500 }
      );
    }

    // Round amounts
    const result = (expenses || []).map((e) => ({
      ...e,
      amount: Math.round(e.amount * 100) / 100,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST /api/expenses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dairyId, category, amount, description, date, synced } = body;

    if (!dairyId || !category || amount === undefined || !date) {
      return NextResponse.json(
        { error: "dairyId, category, amount, and date are required" },
        { status: 400 }
      );
    }

    const roundedAmount = Math.round(amount * 100) / 100;

    const { data: expense, error: insertError } = await supabase
      .from("Expense")
      .insert({
        dairyId,
        category,
        amount: roundedAmount,
        description: description || null,
        date,
        synced: synced !== undefined ? synced : true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/expenses error:", insertError);
      return NextResponse.json(
        { error: "Failed to create expense" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...expense,
      amount: Math.round(expense.amount * 100) / 100,
    });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}

// PUT /api/expenses
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, dairyId, category, amount, description, date, synced } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Expense id is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: lookupError } = await supabase
      .from("Expense")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) { console.error("PUT /api/expenses: error fetching expense", lookupError); }

    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (dairyId !== undefined) data.dairyId = dairyId;
    if (category !== undefined) data.category = category;
    if (amount !== undefined) data.amount = Math.round(amount * 100) / 100;
    if (description !== undefined) data.description = description;
    if (date !== undefined) data.date = date;
    if (synced !== undefined) data.synced = synced;

    const { data: expense, error: updateError } = await supabase
      .from("Expense")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("PUT /api/expenses error:", updateError);
      return NextResponse.json(
        { error: "Failed to update expense" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...expense,
      amount: Math.round(expense.amount * 100) / 100,
    });
  } catch (error) {
    console.error("PUT /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses?id=...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Expense id query parameter is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: lookupError } = await supabase
      .from("Expense")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) { console.error("DELETE /api/expenses: error fetching expense", lookupError); }

    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("Expense")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DELETE /api/expenses error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete expense" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
