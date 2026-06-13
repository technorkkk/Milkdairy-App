import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { roundTo2, reconcileAccount } from "@/lib/accounting";

/**
 * Recalculate a customer's walletBalance and totalOutstanding
 * based on all their deliveries and payments.
 */
async function recalculateCustomerBalances(customerId: string) {
  const { data: customer, error: customerError } = await supabase
    .from("Customer")
    .select("id, billingType, openingBalance")
    .eq("id", customerId)
    .maybeSingle();
  if (customerError) { console.error("recalculateCustomerBalances: error fetching customer", customerError); }

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

    const { data: customers, error } = await supabase
      .from("Customer")
      .select("*")
      .eq("dairyId", dairyId)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("GET /api/customers error:", error);
      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ customers: customers || [] });
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
    const { data: dairy, error: dairyLookupError } = await supabase
      .from("Dairy")
      .select("id")
      .eq("id", dairyId)
      .maybeSingle();
    if (dairyLookupError) { console.error("POST /api/customers: error verifying dairy", dairyLookupError); }

    if (!dairy) {
      return NextResponse.json(
        { error: "Dairy not found" },
        { status: 404 }
      );
    }

    // Check for duplicate customer (same name + phone in same dairy)
    const duplicateQuery = supabase
      .from("Customer")
      .select("id")
      .eq("dairyId", dairyId)
      .eq("name", name);

    if (phone) {
      duplicateQuery.eq("phone", phone);
    }

    const { data: existingCustomer, error: duplicateError } = await duplicateQuery.maybeSingle();
    if (duplicateError) { console.error("POST /api/customers: error checking duplicate", duplicateError); }

    if (existingCustomer) {
      return NextResponse.json(
        { error: "A customer with this name already exists in this dairy" },
        { status: 409 }
      );
    }

    const { data: customer, error: insertError } = await supabase
      .from("Customer")
      .insert({
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
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/customers error:", insertError);
      return NextResponse.json(
        { error: "Failed to create customer" },
        { status: 500 }
      );
    }

    // If openingBalance > 0, create a ledger event
    if (openingBalance > 0 && customer) {
      await supabase.from("LedgerEvent").insert({
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
      });
    }

    // Recalculate balances
    await recalculateCustomerBalances(customer.id);

    // Fetch the updated customer to return
    const { data: updatedCustomer, error: fetchError } = await supabase
      .from("Customer")
      .select("*")
      .eq("id", customer.id)
      .maybeSingle();
    if (fetchError) { console.error("POST /api/customers: error fetching updated customer", fetchError); }

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

    const { data: existingCustomer, error: lookupError } = await supabase
      .from("Customer")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) { console.error("PUT /api/customers: error fetching customer", lookupError); }

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
        await supabase.from("QuantityHistory").insert({
          customerId: id,
          quantity: newQty,
          previousQuantity: oldQty,
          effectiveFrom: fieldsToUpdate.quantityEffectiveFrom,
        });

        // Create a ledger event for the quantity change
        await supabase.from("LedgerEvent").insert({
          customerId: id,
          eventType: "edit",
          referenceId: id,
          amount: 0,
          balanceAfter: existingCustomer.billingType === "prepaid"
            ? existingCustomer.walletBalance
            : existingCustomer.totalOutstanding,
          description: `Quantity changed: ${oldQty}L → ${newQty}L (from ${fieldsToUpdate.quantityEffectiveFrom})`,
          date: fieldsToUpdate.quantityEffectiveFrom,
        });
      }
    }

    await supabase.from("Customer").update(data).eq("id", id);

    // Recalculate balances after update
    await recalculateCustomerBalances(id);

    const { data: updatedCustomer, error: fetchError } = await supabase
      .from("Customer")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) { console.error("PUT /api/customers: error fetching updated customer", fetchError); }

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

    const { data: existingCustomer, error: lookupError } = await supabase
      .from("Customer")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) { console.error("DELETE /api/customers: error fetching customer", lookupError); }

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Delete associated records (Supabase cascade will handle related records if FK is set up)
    // First delete ledger events and quantity history
    await supabase.from("LedgerEvent").delete().eq("customerId", id);
    await supabase.from("QuantityHistory").delete().eq("customerId", id);
    await supabase.from("Delivery").delete().eq("customerId", id);
    await supabase.from("Payment").delete().eq("customerId", id);

    // Then delete the customer
    const { error: deleteError } = await supabase
      .from("Customer")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DELETE /api/customers error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete customer" },
        { status: 500 }
      );
    }

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
