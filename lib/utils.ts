import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Normalizes a UPC/SKU string for fuzzy matching by:
 * - Trimming whitespace
 * - Removing all non-alphanumeric characters (dashes, spaces, etc.)
 * - Converting to lowercase
 */
export function normalizeUPC(upc: string | null | undefined): string {
  if (!upc) return "";
  return upc.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/**
 * Performs fuzzy matching between two UPC/SKU values.
 * Returns true if the normalized values match.
 */
export function fuzzyMatchUPC(upc1: string | null | undefined, upc2: string | null | undefined): boolean {
  const normalized1 = normalizeUPC(upc1);
  const normalized2 = normalizeUPC(upc2);
  
  if (!normalized1 || !normalized2) return false;
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Also check if one contains the other (for partial matches)
  // This handles cases where one has leading zeros and the other doesn't
  if (normalized1.length > 0 && normalized2.length > 0) {
    // Remove leading zeros for comparison
    const removeLeadingZeros = (str: string) => str.replace(/^0+/, "") || "0";
    const clean1 = removeLeadingZeros(normalized1);
    const clean2 = removeLeadingZeros(normalized2);
    
    if (clean1 === clean2) return true;
    
    // Check if one is a substring of the other (for partial matches)
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      // Only allow substring matches if the difference is small (e.g., leading zeros)
      const lengthDiff = Math.abs(clean1.length - clean2.length);
      return lengthDiff <= 2; // Allow up to 2 character difference
    }
  }
  
  return false;
}

