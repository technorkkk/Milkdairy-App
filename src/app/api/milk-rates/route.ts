import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/milk-rates?dairyId=...
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

    const milkRates = await db.milkRate.findMany({
      where: { dairyId },
      orderBy: { effectiveFrom: "desc" },
    });

    // Round pricePerL
    const result = milkRates.map((r) => ({
      ...r,
      pricePerL: Math.round(r.pricePerL * 100) / 100,
    }));

    return NextResponse.json({ rates: result });
  } catch (error) {
    console.error("GET /api/milk-rates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch milk rates" },
      { status: 500 }
    );
  }
}

// POST /api/milk-rates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dairyId, milkType, pricePerL, shift, effectiveFrom } = body;

    if (!dairyId || !milkType || pricePerL === undefined) {
      return NextResponse.json(
        { error: "dairyId, milkType, and pricePerL are required" },
        { status: 400 }
      );
    }

    const roundedPricePerL = Math.round(pricePerL * 100) / 100;

    const milkRate = await db.milkRate.create({
      data: {
        dairyId,
        milkType,
        pricePerL: roundedPricePerL,
        shift: shift || "morning",
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      },
    });

    return NextResponse.json({
      rate: {
        ...milkRate,
        pricePerL: Math.round(milkRate.pricePerL * 100) / 100,
      },
    });
  } catch (error) {
    console.error("POST /api/milk-rates error:", error);
    return NextResponse.json(
      { error: "Failed to create milk rate" },
      { status: 500 }
    );
  }
}

// PUT /api/milk-rates
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, dairyId, milkType, pricePerL, shift, effectiveFrom } = body;

    if (!id) {
      return NextResponse.json(
        { error: "MilkRate id is required" },
        { status: 400 }
      );
    }

    const existing = await db.milkRate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Milk rate not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (dairyId !== undefined) data.dairyId = dairyId;
    if (milkType !== undefined) data.milkType = milkType;
    if (pricePerL !== undefined)
      data.pricePerL = Math.round(pricePerL * 100) / 100;
    if (shift !== undefined) data.shift = shift;
    if (effectiveFrom !== undefined) data.effectiveFrom = new Date(effectiveFrom);

    const milkRate = await db.milkRate.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      rate: {
        ...milkRate,
        pricePerL: Math.round(milkRate.pricePerL * 100) / 100,
      },
    });
  } catch (error) {
    console.error("PUT /api/milk-rates error:", error);
    return NextResponse.json(
      { error: "Failed to update milk rate" },
      { status: 500 }
    );
  }
}

// DELETE /api/milk-rates?id=...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "MilkRate id query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await db.milkRate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Milk rate not found" },
        { status: 404 }
      );
    }

    await db.milkRate.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/milk-rates error:", error);
    return NextResponse.json(
      { error: "Failed to delete milk rate" },
      { status: 500 }
    );
  }
}
