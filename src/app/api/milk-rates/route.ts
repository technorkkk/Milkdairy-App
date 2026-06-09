import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    const { data: milkRates, error } = await supabase
      .from("MilkRate")
      .select("*")
      .eq("dairyId", dairyId)
      .order("effectiveFrom", { ascending: false });

    if (error) {
      console.error("GET /api/milk-rates error:", error);
      return NextResponse.json(
        { error: "Failed to fetch milk rates" },
        { status: 500 }
      );
    }

    // Round pricePerL
    const result = (milkRates || []).map((r) => ({
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

    const { data: milkRate, error: insertError } = await supabase
      .from("MilkRate")
      .insert({
        dairyId,
        milkType,
        pricePerL: roundedPricePerL,
        shift: shift || "morning",
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/milk-rates error:", insertError);
      return NextResponse.json(
        { error: "Failed to create milk rate" },
        { status: 500 }
      );
    }

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

    const { data: existing } = await supabase
      .from("MilkRate")
      .select("id")
      .eq("id", id)
      .maybeSingle();

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
    if (effectiveFrom !== undefined) data.effectiveFrom = new Date(effectiveFrom).toISOString();

    const { data: milkRate, error: updateError } = await supabase
      .from("MilkRate")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("PUT /api/milk-rates error:", updateError);
      return NextResponse.json(
        { error: "Failed to update milk rate" },
        { status: 500 }
      );
    }

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

    const { data: existing } = await supabase
      .from("MilkRate")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Milk rate not found" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("MilkRate")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DELETE /api/milk-rates error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete milk rate" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/milk-rates error:", error);
    return NextResponse.json(
      { error: "Failed to delete milk rate" },
      { status: 500 }
    );
  }
}
