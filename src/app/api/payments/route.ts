import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { roundTo2, reconcileAccount } from "@/lib/accounting";

/**
 * Helper: recalculate a customer's walletBalance and totalOutstanding
 * using the shared reconcileAccount() for consistency.
 */
async function recalcCustomerBalances(customerId: string) {
  const { data: customer } = await supabase
    .from("Customer")
    .select("id, billingType, openingBalance")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) return;

  const { data: deliveries } = await supabase
    .from("Delivery")
    .select("quantity, pricePerL")
    .eq("customerId", customerId);

  const { data: payments } = await supabase
    .from("Payment")
    .select("amount")
    .eq("customerId", customerId);

  const result = reconcileAccount(
    customer.billingType as "prepaid" | "postpaid",
    customer.openingBalance,
    deliveries || [],
    payments || []
  );

  await supabase
    .from("Customer")
    .update({
      walletBalance: result.walletBalance,
      totalOutstanding: result.totalOutstanding,
    })
    .eq("id", customerId);

  return result;
}

// GET /api/payments?dairyId=...&dateFrom=...&dateTo=...
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

    // Find all customer IDs for this dairy
    const { data: customers } = await supabase
      .from("Customer")
      .select("id")
      .eq("dairyId", dairyId);

    const customerIds = (customers || []).map((c) => c.id);

    if (customerIds.length === 0) {
      return NextResponse.json([]);
    }

    // Build query for payments
    let query = supabase
      .from("Payment")
      .select("*, customer:Customer(name, phone)")
      .in("customerId", customerIds)
      .order("date", { ascending: false });

    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("date", dateTo);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error("GET /api/payments error:", error);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    // Round amounts
    const result = (payments || []).map((p) => ({
      ...p,
      amount: roundTo2(p.amount),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, amount, paymentMode, date, notes, receiptNo, synced } =
      body;

    if (!customerId || amount === undefined || !date) {
      return NextResponse.json(
        { error: "customerId, amount, and date are required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const roundedAmount = roundTo2(amount);

    // Verify customer exists
    const { data: customer } = await supabase
      .from("Customer")
      .select("id, billingType")
      .eq("id", customerId)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Create the payment
    const { data: payment, error: insertError } = await supabase
      .from("Payment")
      .insert({
        customerId,
        amount: roundedAmount,
        paymentMode: paymentMode || "cash",
        date,
        notes: notes || null,
        receiptNo: receiptNo || null,
        synced: synced !== undefined ? synced : true,
      })
      .select("*, customer:Customer(name, phone)")
      .single();

    if (insertError) {
      console.error("POST /api/payments error:", insertError);
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }

    // Recalculate balances
    const balances = await recalcCustomerBalances(customerId);
    const balanceAfter =
      customer.billingType === "prepaid"
        ? balances?.walletBalance ?? 0
        : balances?.totalOutstanding ?? 0;

    // Create a ledger event (negative amount = credit)
    await supabase.from("LedgerEvent").insert({
      customerId,
      eventType: "payment",
      referenceId: payment.id,
      amount: -roundedAmount, // negative for credit
      balanceAfter: roundTo2(balanceAfter),
      description: `Payment of ₹${roundedAmount} via ${paymentMode || "cash"}`,
      date,
    });

    return NextResponse.json({
      ...payment,
      amount: roundTo2(payment.amount),
    });
  } catch (error) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

// PUT /api/payments
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, amount, paymentMode, date, notes, receiptNo, synced } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Payment id is required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("Payment")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (amount !== undefined) data.amount = roundTo2(amount);
    if (paymentMode !== undefined) data.paymentMode = paymentMode;
    if (date !== undefined) data.date = date;
    if (notes !== undefined) data.notes = notes;
    if (receiptNo !== undefined) data.receiptNo = receiptNo;
    if (synced !== undefined) data.synced = synced;

    // Check if there's anything to update
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: payment, error: updateError } = await supabase
      .from("Payment")
      .update(data)
      .eq("id", id)
      .select("*, customer:Customer(name, phone)")
      .single();

    if (updateError) {
      console.error("PUT /api/payments error:", updateError);
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    // Recalculate balances for the customer (single recalculation, not double)
    const customerId = existing.customerId;
    const balances = await recalcCustomerBalances(customerId);

    // Create an edit ledger event
    const { data: customer } = await supabase
      .from("Customer")
      .select("billingType")
      .eq("id", customerId)
      .maybeSingle();

    if (customer && balances) {
      const balanceAfter =
        customer.billingType === "prepaid"
          ? balances.walletBalance
          : balances.totalOutstanding;

      await supabase.from("LedgerEvent").insert({
        customerId,
        eventType: "edit",
        referenceId: id,
        amount: -((data.amount as number) ?? existing.amount),
        balanceAfter: roundTo2(balanceAfter),
        description: `Payment updated`,
        date: payment.date,
      });
    }

    return NextResponse.json({
      ...payment,
      amount: roundTo2(payment.amount),
    });
  } catch (error) {
    console.error("PUT /api/payments error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

// DELETE /api/payments?id=...
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Payment id query parameter is required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("Payment")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const customerId = existing.customerId;

    // Get customer info before deleting
    const { data: customer } = await supabase
      .from("Customer")
      .select("id, billingType")
      .eq("id", customerId)
      .maybeSingle();

    // Delete the payment
    const { error: deleteError } = await supabase
      .from("Payment")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DELETE /api/payments error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete payment" },
        { status: 500 }
      );
    }

    // Recalculate balances after deletion
    const balances = await recalcCustomerBalances(customerId);

    // Create a delete ledger event
    if (customer && balances) {
      const balanceAfter =
        customer.billingType === "prepaid"
          ? balances.walletBalance
          : balances.totalOutstanding;

      await supabase.from("LedgerEvent").insert({
        customerId,
        eventType: "delete",
        referenceId: id,
        amount: existing.amount, // positive = reversing the credit
        balanceAfter: roundTo2(balanceAfter),
        description: `Payment of ₹${existing.amount} deleted`,
        date: existing.date,
      });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/payments error:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
