import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date string (yyyy-MM-dd) using the business date_format setting.
 * Supports dd/MM/yyyy, MM/dd/yyyy, yyyy-MM-dd, dd-MM-yyyy.
 */
export function formatDisplayDate(dateStr: string | null | undefined, dateFormat: string = 'dd/MM/yyyy'): string {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return format(d, dateFormat);
  } catch {
    return dateStr;
  }
}

/** Validate phone: only digits, spaces, +, -, parens. At least 10 digits. */
export function isValidPhone(phone: string): boolean {
  if (!phone) return true; // optional field
  const digitsOnly = phone.replace(/\D/g, '');
  return /^[0-9+\-() ]+$/.test(phone) && digitsOnly.length >= 10;
}

/** Basic email validation */
export function isValidEmail(email: string): boolean {
  if (!email) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
