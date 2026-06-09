import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Build date filter
    const dateFilter: Record<string, string> = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;

    const expenses = await db.expense.findMany({
      where: {
        dairyId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: "desc" },
    });

    // Round amounts
    const result = expenses.map((e) => ({
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

    const expense = await db.expense.create({
      data: {
        dairyId,
        category,
        amount: roundedAmount,
        description: description || null,
        date,
        synced: synced !== undefined ? synced : true,
      },
    });

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

    const existing = await db.expense.findUnique({ where: { id } });
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

    const expense = await db.expense.update({
      where: { id },
      data,
    });

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

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await db.expense.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/expenses error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
