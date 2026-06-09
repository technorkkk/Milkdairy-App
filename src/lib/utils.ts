import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isToday, isYesterday, startOfDay, endOfDay } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

/**
 * Format date for input fields
 */
export function formatDateForInput(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getTodayStr(): string {
  return formatDateForInput();
}

/**
 * Get start and end of month
 */
export function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  return {
    start: format(startOfDay(new Date(date.getFullYear(), date.getMonth(), 1)), "yyyy-MM-dd"),
    end: format(endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0)), "yyyy-MM-dd"),
  };
}

/**
 * Get list of dates in a month
 */
export function getDatesInMonth(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(format(new Date(year, month, day), "yyyy-MM-dd"));
  }
  return dates;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Category labels
 */
export const EXPENSE_CATEGORIES: Record<string, string> = {
  feed: "Animal Feed",
  fuel: "Fuel",
  salary: "Salary",
  maintenance: "Maintenance",
  transport: "Transport",
  other: "Other",
};

export const PAYMENT_MODES: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank Transfer",
  other: "Other",
};

export const MILK_TYPES: Record<string, string> = {
  cow: "Cow Milk",
  buffalo: "Buffalo Milk",
  mixed: "Mixed Milk",
};

export const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning",
  evening: "Evening",
  both: "Both",
};

export const BILLING_TYPE_LABELS: Record<string, string> = {
  prepaid: "Prepaid",
  postpaid: "Postpaid",
};
