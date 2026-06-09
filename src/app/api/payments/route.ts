import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { roundTo2 } from "@/lib/accounting";

/**
 * Helper: recalculate a customer's walletBalance and totalOutstanding.
 */
async function recalcCustomerBalances(customerId: string) {
  const { data: customer } = await supabase
    .from("Customer")
    .select("id, billingType, openingBalance")
    .eq("id", customerId)
    .single();

  if (!customer) return;

  const { data: deliveries } = await supabase
    .from("Delivery")
    .select("quantity, pricePerL")
    .eq("customerId", customerId)
    .eq("status", "delivered");

  const { data: payments } = await supabase
    .from("Payment")
    .select("amount")
    .eq("customerId", customerId);

  const totalDeliveriesCost = (deliveries || []).reduce(
    (sum, d) => sum + d.quantity * d.pricePerL,
    0
  );
  const totalPayments = (payments || []).reduce((sum, p) => sum + p.amount, 0);

  let walletBalance = 0;
  let totalOutstanding = 0;

  if (customer.billingType === "prepaid") {
    walletBalance =
      Math.round((totalPayments + customer.openingBalance - totalDeliveriesCost) * 100) /
      100;
    totalOutstanding = 0;
  } else {
    totalOutstanding =
      Math.max(
        0,
        Math.round(
          (totalDeliveriesCost + customer.openingBalance - totalPayments) * 100
        ) / 100
      );
    walletBalance = 0;
  }

  walletBalance = Math.round(walletBalance * 100) / 100;
  totalOutstanding = Math.round(totalOutstanding * 100) / 100;

  await supabase
    .from("Customer")
    .update({ walletBalance, totalOutstanding })
    .eq("id", customerId);

  return { walletBalance, totalOutstanding };
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
      amount: Math.round(p.amount * 100) / 100,
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

    const roundedAmount = Math.round(amount * 100) / 100;

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

    // Create a ledger event (negative amount = credit)
    const { data: customer } = await supabase
      .from("Customer")
      .select("id, billingType")
      .eq("id", customerId)
      .single();

    if (customer) {
      // Get current balance for balanceAfter
      const balances = await recalcCustomerBalances(customerId);
      const balanceAfter =
        customer.billingType === "prepaid"
          ? balances?.walletBalance ?? 0
          : balances?.totalOutstanding ?? 0;

      await supabase.from("LedgerEvent").insert({
        customerId,
        eventType: "payment",
        referenceId: payment.id,
        amount: -roundedAmount, // negative for credit
        balanceAfter: Math.round(balanceAfter * 100) / 100,
        description: `Payment of ₹${roundedAmount} via ${paymentMode || "cash"}`,
        date,
      });
    }

    return NextResponse.json({
      ...payment,
      amount: Math.round(payment.amount * 100) / 100,
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
    const { id, customerId, amount, paymentMode, date, notes, receiptNo, synced } =
      body;

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
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (amount !== undefined) data.amount = Math.round(amount * 100) / 100;
    if (paymentMode !== undefined) data.paymentMode = paymentMode;
    if (date !== undefined) data.date = date;
    if (notes !== undefined) data.notes = notes;
    if (receiptNo !== undefined) data.receiptNo = receiptNo;
    if (synced !== undefined) data.synced = synced;

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

    // Recalculate balances for the affected customer
    const targetCustomerId = customerId || existing.customerId;
    await recalcCustomerBalances(targetCustomerId);

    // Create an edit ledger event
    const { data: customer } = await supabase
      .from("Customer")
      .select("billingType")
      .eq("id", targetCustomerId)
      .single();

    if (customer) {
      const updatedBalances = await recalcCustomerBalances(targetCustomerId);
      const balanceAfter =
        customer.billingType === "prepaid"
          ? updatedBalances?.walletBalance ?? 0
          : updatedBalances?.totalOutstanding ?? 0;

      await supabase.from("LedgerEvent").insert({
        customerId: targetCustomerId,
        eventType: "edit",
        referenceId: id,
        amount: -((data.amount as number) ?? existing.amount),
        balanceAfter: Math.round(balanceAfter * 100) / 100,
        description: `Payment updated`,
        date: payment.date,
      });
    }

    return NextResponse.json({
      ...payment,
      amount: Math.round(payment.amount * 100) / 100,
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
      .single();

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
      .single();

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

    // Recalculate balances
    if (customer) {
      const updatedBalances = await recalcCustomerBalances(customerId);
      const balanceAfter =
        customer.billingType === "prepaid"
          ? updatedBalances?.walletBalance ?? 0
          : updatedBalances?.totalOutstanding ?? 0;

      await supabase.from("LedgerEvent").insert({
        customerId,
        eventType: "delete",
        referenceId: id,
        amount: existing.amount, // positive = reversing the credit
        balanceAfter: Math.round(balanceAfter * 100) / 100,
        description: `Payment of ₹${existing.amount} deleted`,
        date: existing.date,
      });
    } else {
      await recalcCustomerBalances(customerId);
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
