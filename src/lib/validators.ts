import { z } from "zod";

// ===== Auth =====
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ===== Dairy =====
export const dairySetupSchema = z.object({
  name: z.string().min(2, "Dairy name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  ownerName: z.string().min(2, "Owner name is required"),
});

// ===== Customer =====
export const customerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  billingType: z.enum(["prepaid", "postpaid"]),
  milkType: z.enum(["cow", "buffalo", "mixed"]),
  defaultQuantity: z.coerce.number().min(0, "Quantity must be positive").default(0),
  shift: z.enum(["morning", "evening", "both"]),
  openingBalance: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().optional(), // Customer's actual service start date (YYYY-MM-DD)
});

// ===== Delivery =====
export const deliverySchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.string().min(1, "Date is required"),
  shift: z.enum(["morning", "evening"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  milkType: z.enum(["cow", "buffalo", "mixed"]),
  pricePerL: z.coerce.number().positive("Price must be positive"),
  status: z.enum(["delivered", "skipped", "cancelled"]).default("delivered"),
  notes: z.string().optional(),
});

// ===== Payment =====
export const paymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMode: z.enum(["cash", "upi", "bank", "other"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  receiptNo: z.string().optional(),
});

// ===== Expense =====
export const expenseSchema = z.object({
  category: z.enum(["feed", "fuel", "salary", "maintenance", "transport", "other"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

// ===== Milk Rate =====
export const milkRateSchema = z.object({
  milkType: z.enum(["cow", "buffalo", "mixed"]),
  pricePerL: z.coerce.number().positive("Price must be positive"),
  shift: z.enum(["morning", "evening", "both"]),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

// ===== Inventory =====
export const inventorySchema = z.object({
  name: z.string().min(2, "Item name is required"),
  category: z.enum(["milk", "feed", "supply", "equipment", "other"]),
  quantity: z.coerce.number().min(0, "Quantity must be positive").default(0),
  unit: z.enum(["litre", "kg", "piece", "packet"]),
  minStock: z.coerce.number().min(0).default(0),
  pricePerUnit: z.coerce.number().min(0).default(0),
});

// ===== Type exports =====
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type DairySetupInput = z.infer<typeof dairySetupSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type DeliveryInput = z.infer<typeof deliverySchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type MilkRateInput = z.infer<typeof milkRateSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
