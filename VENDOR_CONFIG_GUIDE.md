# Vendor Configuration Guide

## Overview

The inventory addition feature supports vendor-specific stock calculation functions. Each vendor can have a custom JavaScript function that calculates stock quantity from CSV row data.

## Current Implementation

Vendor configurations are stored in `lib/vendor-configs.ts`. Each vendor has:
- `name`: Internal identifier (e.g., "Vendor_Kehe")
- `displayName`: User-friendly name shown in the UI
- `calculateStock`: Function that takes a CSV row and returns a number

## Example: Vendor_Kehe

```typescript
const vendorKehe: VendorConfig = {
  name: "Vendor_Kehe",
  displayName: "Kehe",
  calculateStock: (row: Record<string, string>) => {
    const shipQuantity = row.ShipQuantity || row["Ship Quantity"] || row["ShipQuantity"] || "0";
    return parseInt(shipQuantity, 10) || 0;
  },
};
```

**How it works:**
- Looks for "ShipQuantity" column (handles variations like "Ship Quantity")
- Parses the value as an integer
- Returns 0 if not found or invalid

## Example: Vendor_CoreMark

```typescript
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
```

**How it works:**
- Gets quantity from "Qty" column
- Checks "Broken Case" column for checkmark (✔, ✓, or "true")
- If broken case: returns just Qty
- Otherwise: returns Qty × Unit Size

## Adding a New Vendor Configuration

1. Open `lib/vendor-configs.ts`

2. Create a new vendor config object:

```typescript
const vendorYourVendor: VendorConfig = {
  name: "Vendor_YourVendor",
  displayName: "Your Vendor Name",
  calculateStock: (row: Record<string, string>) => {
    // Your calculation logic here
    // Access CSV columns via row["Column Name"] or row.ColumnName
    // Return a number
    return 0;
  },
};
```

3. Add it to the `vendorConfigs` array:

```typescript
export const vendorConfigs: VendorConfig[] = [
  vendorKehe,
  vendorCoreMark,
  vendorYourVendor,  // Add here
  defaultVendor,
];
```

## Tips for Writing Stock Calculation Functions

### Accessing CSV Columns

CSV columns are accessible via the `row` object:
- `row["Column Name"]` - Use brackets for column names with spaces
- `row.ColumnName` - Use dot notation for column names without spaces
- Handle variations: `row.ShipQuantity || row["Ship Quantity"]`

### Parsing Numbers

Always use `parseInt()` with a fallback:
```typescript
const value = parseInt(row.Quantity || "0", 10) || 0;
```

### Handling Checkboxes/Booleans

Check for various representations:
```typescript
const isChecked = 
  row["Broken Case"] === "✔" || 
  row["Broken Case"] === "✓" || 
  row["Broken Case"].toLowerCase() === "true";
```

### Complex Calculations

You can write any JavaScript logic:
```typescript
calculateStock: (row: Record<string, string>) => {
  const baseQty = parseInt(row.Quantity || "0", 10);
  const multiplier = parseFloat(row.Multiplier || "1.0");
  const discount = parseFloat(row.Discount || "0.0");
  
  return Math.floor((baseQty * multiplier) * (1 - discount));
},
```

## Testing Your Configuration

1. Add your vendor config to `lib/vendor-configs.ts`
2. Restart your development server
3. In the "Add Inventory" modal, select your vendor from the "Vendor Stock Calculation" dropdown
4. Upload a test CSV file
5. Review the "Stock Update Preview" to verify calculations

## Advanced: Dynamic JavaScript Injection (Future)

If you want to allow users to define vendor configs dynamically (stored in database), you can:

1. Store vendor configs in database with JavaScript function strings
2. Use `Function()` constructor to create functions at runtime:

```typescript
// Example stored in database:
{
  name: "Vendor_Custom",
  stockCalculation: "(row) => parseInt(row.Qty) * parseInt(row.Size)"
}

// In your code:
const func = new Function("row", `return ${config.stockCalculation}`);
const stock = func(csvRow);
```

**⚠️ Security Warning:** Using `eval()` or `Function()` with user-provided code is a security risk. Only use this approach if:
- Users are trusted
- Code is validated before execution
- Running in a sandboxed environment

For most use cases, the static configuration in `lib/vendor-configs.ts` is recommended.

