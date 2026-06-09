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
}

// GET /api/customers?dairyId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dairyId = searchParams.get("dairyId");

    if (!dairyId) {
      return NextResponse.json(
        { error: "dairyId query parameter is required" },
        { status: 400 }
      );
    }

    const customers = await db.customer.findMany({
      where: { dairyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST /api/customers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      address,
      billingType = "postpaid",
      milkType = "cow",
      defaultQuantity = 0,
      shift = "morning",
      openingBalance = 0,
      isActive = true,
      startDate,
      dairyId,
    } = body;

    if (!name || !dairyId) {
      return NextResponse.json(
        { error: "name and dairyId are required" },
        { status: 400 }
      );
    }

    // Verify the dairy exists
    const dairy = await db.dairy.findUnique({ where: { id: dairyId } });
    if (!dairy) {
      return NextResponse.json(
        { error: "Dairy not found" },
        { status: 404 }
      );
    }

    const customer = await db.customer.create({
      data: {
        name,
        phone: phone || null,
        address: address || null,
        billingType,
        milkType,
        defaultQuantity: roundTo2(defaultQuantity),
        shift,
        openingBalance: roundTo2(openingBalance),
        isActive,
        startDate: startDate || null,
        dairyId,
      },
    });

    // If openingBalance > 0, create a ledger event
    if (openingBalance > 0) {
      await db.ledgerEvent.create({
        data: {
          customerId: customer.id,
          eventType: "opening_balance",
          referenceId: customer.id,
          amount:
            billingType === "prepaid"
              ? -roundTo2(openingBalance)
              : roundTo2(openingBalance),
          balanceAfter: 0, // will be updated after recalculation
          description: `Opening balance: ₹${roundTo2(openingBalance)} (${billingType})`,
          date: new Date().toISOString().split("T")[0],
        },
      });
    }

    // Recalculate balances
    await recalculateCustomerBalances(customer.id);

    // Fetch the updated customer to return
    const updatedCustomer = await db.customer.findUnique({
      where: { id: customer.id },
    });

    return NextResponse.json({ customer: updatedCustomer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

// PUT /api/customers
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fieldsToUpdate } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Customer id is required" },
        { status: 400 }
      );
    }

    const existingCustomer = await db.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Build update data, only including provided fields
    const data: Record<string, unknown> = {};

    if (fieldsToUpdate.name !== undefined) data.name = fieldsToUpdate.name;
    if (fieldsToUpdate.phone !== undefined) data.phone = fieldsToUpdate.phone || null;
    if (fieldsToUpdate.address !== undefined) data.address = fieldsToUpdate.address || null;
    if (fieldsToUpdate.billingType !== undefined) data.billingType = fieldsToUpdate.billingType;
    if (fieldsToUpdate.milkType !== undefined) data.milkType = fieldsToUpdate.milkType;
    if (fieldsToUpdate.defaultQuantity !== undefined) data.defaultQuantity = roundTo2(fieldsToUpdate.defaultQuantity);
    if (fieldsToUpdate.shift !== undefined) data.shift = fieldsToUpdate.shift;
    if (fieldsToUpdate.openingBalance !== undefined) data.openingBalance = roundTo2(fieldsToUpdate.openingBalance);
    if (fieldsToUpdate.isActive !== undefined) data.isActive = fieldsToUpdate.isActive;
    if (fieldsToUpdate.startDate !== undefined) data.startDate = fieldsToUpdate.startDate || null;
    if (fieldsToUpdate.dairyId !== undefined) data.dairyId = fieldsToUpdate.dairyId;

    // Track quantity change with effective date
    if (fieldsToUpdate.defaultQuantity !== undefined && fieldsToUpdate.quantityEffectiveFrom) {
      const oldQty = existingCustomer.defaultQuantity;
      const newQty = roundTo2(fieldsToUpdate.defaultQuantity);
      if (oldQty !== newQty) {
        await db.quantityHistory.create({
          data: {
            customerId: id,
            quantity: newQty,
            previousQuantity: oldQty,
            effectiveFrom: fieldsToUpdate.quantityEffectiveFrom,
          },
        });

        // Create a ledger event for the quantity change
        await db.ledgerEvent.create({
          data: {
            customerId: id,
            eventType: "edit",
            referenceId: id,
            amount: 0,
            balanceAfter: existingCustomer.billingType === "prepaid"
              ? existingCustomer.walletBalance
              : existingCustomer.totalOutstanding,
            description: `Quantity changed: ${oldQty}L → ${newQty}L (from ${fieldsToUpdate.quantityEffectiveFrom})`,
            date: fieldsToUpdate.quantityEffectiveFrom,
          },
        });
      }
    }

    await db.customer.update({
      where: { id },
      data,
    });

    // Recalculate balances after update
    await recalculateCustomerBalances(id);

    const updatedCustomer = await db.customer.findUnique({
      where: { id },
    });

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("PUT /api/customers error:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers?id=xxx
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

    const existingCustomer = await db.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Cascade delete will handle deliveries, payments, and ledgerEvents
    await db.customer.delete({ where: { id } });

    return NextResponse.json({
      message: "Customer deleted successfully",
      id,
    });
  } catch (error) {
    console.error("DELETE /api/customers error:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
