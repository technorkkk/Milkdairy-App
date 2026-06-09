/**
 * Accounting & Reconciliation Engine
 * 
 * Core rules:
 * - Total Deliveries Cost = sum(quantity * price_at_time)
 * - Total Payments Amount = sum(payments.amount)
 * - Prepaid:  wallet_balance = Total Payments - Total Deliveries Cost; total_outstanding = 0
 * - Postpaid: total_outstanding = max(0, Total Deliveries Cost - Total Payments); wallet_balance = 0
 * - Opening balance is treated as an initial payment for prepaid, or initial delivery cost for postpaid
 * - Every balance change must be a ledger event, never a silent overwrite
 */

export interface LedgerEntry {
  id: string;
  eventType: "delivery" | "payment" | "opening_balance" | "rate_change" | "edit" | "delete";
  amount: number;        // positive = debit (cost), negative = credit (payment)
  date: string;
  description?: string;
  referenceId?: string;
}

export interface CustomerAccount {
  billingType: "prepaid" | "postpaid";
  openingBalance: number;
  walletBalance: number;
  totalOutstanding: number;
}

export interface ReconciliationResult {
  totalDeliveriesCost: number;
  totalPayments: number;
  walletBalance: number;
  totalOutstanding: number;
  openingBalance: number;
  netPosition: number;
}

/**
 * Round a number to 2 decimal places to avoid floating point drift
 */
export function roundTo2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Reconcile a customer's account from ledger events
 * This is the source of truth for all balance calculations
 */
export function reconcileAccount(
  billingType: "prepaid" | "postpaid",
  openingBalance: number,
  deliveries: Array<{ quantity: number; pricePerL: number }>,
  payments: Array<{ amount: number }>
): ReconciliationResult {
  const totalDeliveriesCost = roundTo2(
    deliveries.reduce((sum, d) => sum + roundTo2(d.quantity * d.pricePerL), 0)
  );
  const totalPayments = roundTo2(
    payments.reduce((sum, p) => sum + roundTo2(p.amount), 0)
  );

  let walletBalance = 0;
  let totalOutstanding = 0;

  if (billingType === "prepaid") {
    // Prepaid: opening balance is treated as initial wallet credit
    // wallet = (payments + opening balance) - deliveries
    walletBalance = roundTo2(totalPayments + openingBalance - totalDeliveriesCost);
    totalOutstanding = 0;
  } else {
    // Postpaid: opening balance is treated as initial outstanding
    // outstanding = deliveries + opening balance - payments
    totalOutstanding = Math.max(0, roundTo2(totalDeliveriesCost + openingBalance - totalPayments));
    walletBalance = 0;
  }

  const netPosition = roundTo2(totalDeliveriesCost + openingBalance - totalPayments);

  return {
    totalDeliveriesCost,
    totalPayments,
    walletBalance,
    totalOutstanding,
    openingBalance,
    netPosition,
  };
}

/**
 * Create a ledger event for a delivery
 */
export function createDeliveryLedgerEvent(
  deliveryId: string,
  quantity: number,
  pricePerL: number,
  date: string
): Omit<LedgerEntry, "id"> {
  return {
    eventType: "delivery",
    amount: roundTo2(quantity * pricePerL),
    date,
    description: `Delivery: ${quantity}L @ ₹${pricePerL}/L`,
    referenceId: deliveryId,
  };
}

/**
 * Create a ledger event for a payment
 */
export function createPaymentLedgerEvent(
  paymentId: string,
  amount: number,
  date: string,
  mode: string
): Omit<LedgerEntry, "id"> {
  return {
    eventType: "payment",
    amount: -roundTo2(amount), // negative = credit
    date,
    description: `Payment: ₹${amount} via ${mode}`,
    referenceId: paymentId,
  };
}

/**
 * Create a ledger event for opening balance
 */
export function createOpeningBalanceEvent(
  customerId: string,
  amount: number,
  billingType: "prepaid" | "postpaid"
): Omit<LedgerEntry, "id"> {
  return {
    eventType: "opening_balance",
    amount: billingType === "prepaid" ? -roundTo2(amount) : roundTo2(amount),
    date: new Date().toISOString().split("T")[0],
    description: `Opening balance: ₹${amount} (${billingType})`,
    referenceId: customerId,
  };
}

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number compactly for badges (e.g., 1.5L, 500ml)
 */
export function formatQuantity(qty: number): string {
  if (qty >= 1) {
    return qty % 1 === 0 ? `${qty}L` : `${qty.toFixed(1)}L`;
  }
  return `${Math.round(qty * 1000)}ml`;
}
