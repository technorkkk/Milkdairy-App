import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Helper: recalculate a customer's walletBalance and totalOutstanding.
 * - Total Deliveries Cost = sum(quantity * pricePerL) for that customer
 * - Total Payments = sum(amount) for that customer
 * - Prepaid:  wallet_balance = (Total Payments + openingBalance) - Total Deliveries Cost; total_outstanding = 0
 * - Postpaid: total_outstanding = max(0, Total Deliveries Cost + openingBalance - Total Payments); wallet_balance = 0
 */
async function recalcCustomerBalances(customerId: string) {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;

  const deliveries = await db.delivery.findMany({
    where: { customerId, status: "delivered" },
    select: { quantity: true, pricePerL: true },
  });

  const payments = await db.payment.findMany({
    where: { customerId },
    select: { amount: true },
  });

  const totalDeliveriesCost = deliveries.reduce(
    (sum, d) => sum + d.quantity * d.pricePerL,
    0
  );
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

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

  await db.customer.update({
    where: { id: customerId },
    data: { walletBalance, totalOutstanding },
  });

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
    const customers = await db.customer.findMany({
      where: { dairyId },
      select: { id: true },
    });
    const customerIds = customers.map((c) => c.id);

    if (customerIds.length === 0) {
      return NextResponse.json([]);
    }

    // Build date filter
    const dateFilter: Record<string, string> = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;

    const payments = await db.payment.findMany({
      where: {
        customerId: { in: customerIds },
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { date: "desc" },
    });

    // Round amounts
    const result = payments.map((p) => ({
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
    const payment = await db.payment.create({
      data: {
        customerId,
        amount: roundedAmount,
        paymentMode: paymentMode || "cash",
        date,
        notes: notes || null,
        receiptNo: receiptNo || null,
        synced: synced !== undefined ? synced : true,
      },
      include: { customer: { select: { name: true, phone: true } } },
    });

    // Create a ledger event (negative amount = credit)
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (customer) {
      // Get current balance for balanceAfter
      const balances = await recalcCustomerBalances(customerId);
      const balanceAfter =
        customer.billingType === "prepaid"
          ? balances?.walletBalance ?? 0
          : balances?.totalOutstanding ?? 0;

      await db.ledgerEvent.create({
        data: {
          customerId,
          eventType: "payment",
          referenceId: payment.id,
          amount: -roundedAmount, // negative for credit
          balanceAfter: Math.round(balanceAfter * 100) / 100,
          description: `Payment of ₹${roundedAmount} via ${paymentMode || "cash"}`,
          date,
        },
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

    const existing = await db.payment.findUnique({ where: { id } });
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

    const payment = await db.payment.update({
      where: { id },
      data,
      include: { customer: { select: { name: true, phone: true } } },
    });

    // Recalculate balances for the affected customer
    const targetCustomerId = customerId || existing.customerId;
    await recalcCustomerBalances(targetCustomerId);

    // Create an edit ledger event
    const customer = await db.customer.findUnique({
      where: { id: targetCustomerId },
    });
    if (customer) {
      const updatedBalances = await recalcCustomerBalances(targetCustomerId);
      const balanceAfter =
        customer.billingType === "prepaid"
          ? updatedBalances?.walletBalance ?? 0
          : updatedBalances?.totalOutstanding ?? 0;

      await db.ledgerEvent.create({
        data: {
          customerId: targetCustomerId,
          eventType: "edit",
          referenceId: id,
          amount: -(data.amount as number ?? existing.amount),
          balanceAfter: Math.round(balanceAfter * 100) / 100,
          description: `Payment updated`,
          date: payment.date,
        },
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

    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const customerId = existing.customerId;

    // Create a delete ledger event before deleting
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    await db.payment.delete({ where: { id } });

    // Recalculate balances
    if (customer) {
      const updatedBalances = await recalcCustomerBalances(customerId);
      const balanceAfter =
        customer.billingType === "prepaid"
          ? updatedBalances?.walletBalance ?? 0
          : updatedBalances?.totalOutstanding ?? 0;

      await db.ledgerEvent.create({
        data: {
          customerId,
          eventType: "delete",
          referenceId: id,
          amount: existing.amount, // positive = reversing the credit
          balanceAfter: Math.round(balanceAfter * 100) / 100,
          description: `Payment of ₹${existing.amount} deleted`,
          date: existing.date,
        },
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
