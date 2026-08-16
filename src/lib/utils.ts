import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhone(phone?: string) {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("972") && clean.length > 9) {
    return "0" + clean.slice(3);
  }
  if (!clean.startsWith("0") && clean.length === 9) {
    return "0" + clean;
  }
  return clean;
}
