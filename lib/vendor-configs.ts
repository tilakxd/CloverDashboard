/**
 * Vendor-specific stock calculation functions
 * Each function takes a CSV row and returns the stock quantity
 */

export type StockCalculationFunction = (row: Record<string, string>) => number;

export interface VendorConfig {
  name: string;
  displayName: string;
  calculateStock: StockCalculationFunction;
}

/**
 * Vendor_Kehe: Stock is calculated from ShipQuantity column
 */
const vendorKehe: VendorConfig = {
  name: "Vendor_Kehe",
  displayName: "Kehe",
  calculateStock: (row: Record<string, string>) => {
    const shipQuantity = row.ShipQuantity || row["Ship Quantity"] || row["ShipQuantity"] || "0";
    return parseInt(shipQuantity, 10) || 0;
  },
};

/**
 * Vendor_CoreMark: Stock is calculated by Qty * Unit Size,
 * but if Broken Case == "✔", it's just Qty
 */
const vendorCoreMark: VendorConfig = {
  name: "Vendor_CoreMark",
  displayName: "CoreMark",
  calculateStock: (row: Record<string, string>) => {
    const qty = parseInt(row.Qty || row["Qty"] || "0", 10) || 0;
    const brokenCase = row["Broken Case"] || row["BrokenCase"] || row["Broken Case"] || "";
    
    if (brokenCase === "✔" || brokenCase === "✓" || brokenCase.toLowerCase() === "true") {
      return qty;
    }
    
    const unitSize = parseInt(row["Unit Size"] || row["UnitSize"] || row["Unit Size"] || "1", 10) || 1;
    return qty * unitSize;
  },
};

const vendorWalmart: VendorConfig = {
  name: "Vendor_Walmart",
  displayName: "Walmart",
  calculateStock: (row: Record<string, string>) => {
    const status = (row.Status || row["Status"] || "").toLowerCase();
    if (status !== "shopped") return 0;

    const quantity = row.Quantity || row["Quantity"] || "0";
    return parseInt(quantity, 10) || 0;
  },
};

/**
 * Default vendor: Uses selected stock column
 * Note: For default vendor, the stock column name is passed as a special property
 * The modal component will handle passing the selected column name
 */
const defaultVendor: VendorConfig = {
  name: "default",
  displayName: "Default (Select Stock Column)",
  calculateStock: (row: Record<string, string>) => {
    // For default vendor, the stock column name is passed via row._stockColumnName
    // This is handled by the modal component
    const stockColumnName = (row as any)._stockColumnName;
    if (stockColumnName && row[stockColumnName]) {
      const value = parseInt(row[stockColumnName], 10);
      if (!isNaN(value)) return value;
    }
    return 0;
  },
};

export const vendorConfigs: VendorConfig[] = [
  vendorKehe,
  vendorCoreMark,
  vendorWalmart,
  defaultVendor,
];

export function getVendorConfig(name: string): VendorConfig {
  return vendorConfigs.find((config) => config.name === name) || defaultVendor;
}

