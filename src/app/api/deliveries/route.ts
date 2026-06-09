import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roundTo2, reconcileAccount } from "@/lib/accounting";

/**
 * Recalculate a customer's walletBalance and totalOutstanding
 * based on all their deliveries and payments.
 */
async function recalculateCustomerBalances(customerId: string) {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      deliveries: { select: { quantity: true, pricePerL: true } },
      payments: { select: { amount: true } },
    },
  });

  if (!customer) return;

  const result = reconcileAccount(
    customer.billingType as "prepaid" | "postpaid",
    customer.openingBalance,
    customer.deliveries,
    customer.payments
  );

  await db.customer.update({
    where: { id: customerId },
    data: {
      walletBalance: result.walletBalance,
      totalOutstanding: result.totalOutstanding,
    },
  });

  return result;
}

// GET /api/deliveries?dairyId=xxx&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
export async function GET(request: Request) {
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
    const dairyCustomers = await db.customer.findMany({
      where: { dairyId },
      select: { id: true },
    });

    const customerIds = dairyCustomers.map((c) => c.id);

    if (customerIds.length === 0) {
      return NextResponse.json({ deliveries: [] });
    }

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      dateFilter.gte = dateFrom || undefined;
      dateFilter.lte = dateTo || undefined;
    }

    const deliveries = await db.delivery.findMany({
      where: {
        customerId: { in: customerIds },
        ...(dateFrom || dateTo ? { date: dateFilter } : {}),
      },
      include: {
        customer: {
          select: { id: true, name: true, milkType: true, billingType: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ deliveries });
  } catch (error) {
    console.error("GET /api/deliveries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deliveries" },
      { status: 500 }
    );
  }
}

// POST /api/deliveries
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle bulk creation for past entries
    if (body.action === "bulk") {
      const { customerId, startDate, absentDates, shift, milkType, pricePerL, defaultQuantity } = body;

      if (!customerId || !startDate || !shift || !milkType || pricePerL === undefined || defaultQuantity === undefined) {
        return NextResponse.json(
          { error: "customerId, startDate, shift, milkType, pricePerL, and defaultQuantity are required for bulk creation" },
          { status: 400 }
        );
      }

      const deliveries = await bulkCreateDeliveries({
        customerId,
        startDate,
        absentDates: absentDates || [],
        shift,
        milkType,
        pricePerL,
        defaultQuantity,
      });

      return NextResponse.json({ deliveries, count: deliveries.length }, { status: 201 });
    }

    // Normal single delivery creation
    const {
      customerId,
      date,
      shift,
      quantity,
      milkType,
      pricePerL,
      status = "delivered",
      notes,
    } = body;

    if (!customerId || !date || !shift || quantity === undefined || !milkType || pricePerL === undefined) {
      return NextResponse.json(
        { error: "customerId, date, shift, quantity, milkType, and pricePerL are required" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const totalAmount = roundTo2(quantity * pricePerL);

    // Create the delivery
    const delivery = await db.delivery.create({
      data: {
        customerId,
        date,
        shift,
        quantity: roundTo2(quantity),
        milkType,
        pricePerL: roundTo2(pricePerL),
        totalAmount,
        status,
        notes: notes || null,
      },
    });

    // Create a ledger event for the delivery
    await db.ledgerEvent.create({
      data: {
        customerId,
        eventType: "delivery",
        referenceId: delivery.id,
        amount: totalAmount,
        balanceAfter: 0, // placeholder, will be corrected by recalculation
        description: `Delivery: ${quantity}L @ ₹${pricePerL}/L`,
        date,
      },
    });

    // Recalculate the customer's balances
    const result = await recalculateCustomerBalances(customerId);

    // Update the ledger event's balanceAfter with the correct value
    const balanceAfter =
      customer.billingType === "prepaid"
        ? result?.walletBalance ?? 0
        : result?.totalOutstanding ?? 0;

    await db.ledgerEvent.updateMany({
      where: { referenceId: delivery.id, eventType: "delivery" },
      data: { balanceAfter: roundTo2(balanceAfter) },
    });

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deliveries error:", error);
    return NextResponse.json(
      { error: "Failed to create delivery" },
      { status: 500 }
    );
  }
}

// PUT /api/deliveries
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fieldsToUpdate } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Delivery id is required" },
        { status: 400 }
      );
    }

    const existingDelivery = await db.delivery.findUnique({
      where: { id },
    });

    if (!existingDelivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    // Build update data
    const data: Record<string, unknown> = {};

    if (fieldsToUpdate.date !== undefined) data.date = fieldsToUpdate.date;
    if (fieldsToUpdate.shift !== undefined) data.shift = fieldsToUpdate.shift;
    if (fieldsToUpdate.quantity !== undefined) data.quantity = roundTo2(fieldsToUpdate.quantity);
    if (fieldsToUpdate.milkType !== undefined) data.milkType = fieldsToUpdate.milkType;
    if (fieldsToUpdate.pricePerL !== undefined) data.pricePerL = roundTo2(fieldsToUpdate.pricePerL);
    if (fieldsToUpdate.status !== undefined) data.status = fieldsToUpdate.status;
    if (fieldsToUpdate.notes !== undefined) data.notes = fieldsToUpdate.notes || null;
    if (fieldsToUpdate.synced !== undefined) data.synced = fieldsToUpdate.synced;

    // If quantity or pricePerL changed, recalculate totalAmount
    const finalQuantity = fieldsToUpdate.quantity !== undefined
      ? roundTo2(fieldsToUpdate.quantity)
      : existingDelivery.quantity;
    const finalPricePerL = fieldsToUpdate.pricePerL !== undefined
      ? roundTo2(fieldsToUpdate.pricePerL)
      : existingDelivery.pricePerL;

    data.totalAmount = roundTo2(finalQuantity * finalPricePerL);

    await db.delivery.update({
      where: { id },
      data,
    });

    // Update the associated ledger event amount if cost-related fields changed
    if (fieldsToUpdate.quantity !== undefined || fieldsToUpdate.pricePerL !== undefined) {
      const newAmount = roundTo2(finalQuantity * finalPricePerL);
      await db.ledgerEvent.updateMany({
        where: { referenceId: id, eventType: "delivery" },
        data: {
          amount: newAmount,
          description: `Delivery: ${finalQuantity}L @ ₹${finalPricePerL}/L`,
        },
      });
    }

    // Recalculate customer balances
    const result = await recalculateCustomerBalances(existingDelivery.customerId);

    // Update ledger event balanceAfter
    const customer = await db.customer.findUnique({
      where: { id: existingDelivery.customerId },
    });

    if (customer && result) {
      const balanceAfter =
        customer.billingType === "prepaid"
          ? result.walletBalance
          : result.totalOutstanding;

      await db.ledgerEvent.updateMany({
        where: { referenceId: id, eventType: "delivery" },
        data: { balanceAfter: roundTo2(balanceAfter) },
      });
    }

    const updatedDelivery = await db.delivery.findUnique({
      where: { id },
    });

    return NextResponse.json({ delivery: updatedDelivery });
  } catch (error) {
    console.error("PUT /api/deliveries error:", error);
    return NextResponse.json(
      { error: "Failed to update delivery" },
      { status: 500 }
    );
  }
}

// POST /api/deliveries — bulk create for past entries
// Body: { action: "bulk", customerId, startDate, absentDates: string[], shift, milkType, pricePerL, defaultQuantity }
export async function bulkCreateDeliveries(body: {
  customerId: string;
  startDate: string;
  absentDates: string[];
  shift: "morning" | "evening" | "both";
  milkType: string;
  pricePerL: number;
  defaultQuantity: number;
}) {
  const { customerId, startDate, absentDates, shift, milkType, pricePerL, defaultQuantity } = body;

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");

  const today = new Date().toISOString().split("T")[0];
  const absentSet = new Set(absentDates);

  // Generate list of dates from startDate to today
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(today);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    dates.push(dateStr);
    current.setDate(current.getDate() + 1);
  }

  // Determine which shifts to create deliveries for
  const shifts: ("morning" | "evening")[] = shift === "both" ? ["morning", "evening"] : [shift];

  const createdDeliveries = [];

  for (const dateStr of dates) {
    const isAbsent = absentSet.has(dateStr);

    for (const s of shifts) {
      // Check if delivery already exists for this date+shift
      const existing = await db.delivery.findFirst({
        where: { customerId, date: dateStr, shift: s },
      });

      if (existing) continue; // Skip if already exists

      const qty = isAbsent ? 0 : defaultQuantity;
      const status = isAbsent ? "skipped" : "delivered";
      const totalAmount = roundTo2(qty * pricePerL);

      const delivery = await db.delivery.create({
        data: {
          customerId,
          date: dateStr,
          shift: s,
          quantity: roundTo2(qty),
          milkType,
          pricePerL: roundTo2(pricePerL),
          totalAmount,
          status,
          notes: isAbsent ? "Marked absent" : null,
        },
      });

      // Create ledger event
      await db.ledgerEvent.create({
        data: {
          customerId,
          eventType: "delivery",
          referenceId: delivery.id,
          amount: totalAmount,
          balanceAfter: 0,
          description: isAbsent
            ? `Absent: ${dateStr} (${SHIFT_LABELS_MAP[s]})`
            : `Delivery: ${qty}L @ ₹${pricePerL}/L`,
          date: dateStr,
        },
      });

      createdDeliveries.push(delivery);
    }
  }

  // Recalculate customer balances
  await recalculateCustomerBalances(customerId);

  return createdDeliveries;
}

const SHIFT_LABELS_MAP: Record<string, string> = {
  morning: "Morning",
  evening: "Evening",
};

// DELETE /api/deliveries?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    const existingDelivery = await db.delivery.findUnique({
      where: { id },
    });

    if (!existingDelivery) {
      return NextResponse.json(
        { error: "Delivery not found" },
        { status: 404 }
      );
    }

    const customerId = existingDelivery.customerId;

    // Delete associated ledger events for this delivery
    await db.ledgerEvent.deleteMany({
      where: { referenceId: id, eventType: "delivery" },
    });

    // Delete the delivery
    await db.delivery.delete({ where: { id } });

    // Recalculate customer balances
    await recalculateCustomerBalances(customerId);

    return NextResponse.json({
      message: "Delivery deleted successfully",
      id,
    });
  } catch (error) {
    console.error("DELETE /api/deliveries error:", error);
    return NextResponse.json(
      { error: "Failed to delete delivery" },
      { status: 500 }
    );
  }
}
