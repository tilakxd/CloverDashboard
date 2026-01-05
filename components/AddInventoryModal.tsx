"use client";

import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { vendorConfigs, getVendorConfig, type VendorConfig } from "@/lib/vendor-configs";
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface Tag {
  id: string;
  name: string;
}

interface CloverItem {
  id: string;
  name: string;
  sku?: string;
  code?: string;
  stockCount?: number; // Often 0, use itemStock.stockCount instead
  itemStock?: {
    item: {
      id: string;
    };
    stockCount: number;
    quantity: number;
    modifiedTime: number;
  };
}

interface MissingItem {
  id: string;
  name: string;
  sku: string | null;
}

interface MatchedItem {
  csvRow: Record<string, string>;
  item: CloverItem;
  currentStock: number;
  newStock: number;
  calculatedStock: number;
}

interface UnmatchedItem {
  csvRow: Record<string, string>;
  searchValue: string;
  referenceMethod: "upc" | "name";
}

interface AddInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onComplete?: () => void;
}

export function AddInventoryModal({
  open,
  onOpenChange,
  tags,
  onComplete,
}: AddInventoryModalProps) {
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [referenceMethod, setReferenceMethod] = useState<"upc" | "name">("upc");
  const [upcColumn, setUpcColumn] = useState<string>("");
  const [nameColumn, setNameColumn] = useState<string>("");
  const [stockColumn, setStockColumn] = useState<string>("");
  const [selectedVendorConfig, setSelectedVendorConfig] = useState<string>("default");
  const [cloverItems, setCloverItems] = useState<CloverItem[]>([]);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing errors: ${results.errors.map((e) => e.message).join(", ")}`);
          return;
        }

        const data = results.data as Record<string, string>[];
        if (data.length === 0) {
          setError("CSV file is empty");
          return;
        }

        setCsvData(data);
        setCsvHeaders(Object.keys(data[0] || {}));
        
        // Auto-detect columns
        const headers = Object.keys(data[0] || {});
        const upcHeader = headers.find((h) => 
          h.toLowerCase().includes("upc") || h.toLowerCase().includes("sku")
        );
        const nameHeader = headers.find((h) => 
          h.toLowerCase().includes("name") || h.toLowerCase().includes("product")
        );
        const stockHeader = headers.find((h) => 
          h.toLowerCase().includes("quantity") || 
          h.toLowerCase().includes("qty") || 
          h.toLowerCase().includes("stock") ||
          h.toLowerCase().includes("shipquantity")
        );

        if (upcHeader) setUpcColumn(upcHeader);
        if (nameHeader) setNameColumn(nameHeader);
        if (stockHeader) setStockColumn(stockHeader);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const fetchItemsByTag = async (): Promise<CloverItem[]> => {
    if (!selectedTagId) {
      setError("Please select a vendor");
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory/items-by-tag?tagId=${selectedTagId}`);
      if (!response.ok) throw new Error("Failed to fetch items");

      const data = await response.json();
      const items = data.items || [];
      
      // Log first item to debug stock data
      if (items.length > 0) {
        console.log("Sample item from API:", items[0]);
        console.log("Stock count:", items[0].stockCount);
      }
      
      setCloverItems(items);
      return items;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch items");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const findMissingItems = async (itemsWithTag?: CloverItem[]) => {
    if (!selectedTagId || csvData.length === 0) {
      setError("Please select a vendor and upload a CSV file");
      return;
    }

    if (referenceMethod === "upc" && !upcColumn) {
      setError("Please select UPC column");
      return;
    }

    if (referenceMethod === "name" && !nameColumn) {
      setError("Please select Name column");
      return;
    }

    // Use provided items or fall back to state
    const items = itemsWithTag || cloverItems;

    setLoading(true);
    setError(null);

    try {
      const values = csvData.map((row) => 
        referenceMethod === "upc" ? row[upcColumn] : row[nameColumn]
      ).filter(Boolean);

      const response = await fetch("/api/inventory/find-missing-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId: selectedTagId,
          [referenceMethod === "upc" ? "upcs" : "names"]: values,
        }),
      });

      if (!response.ok) throw new Error("Failed to find missing items");

      const data = await response.json();
      const missingItemsFromApi = data.items || [];
      
      // Filter out items that are now in items (they have the tag)
      const itemsWithTagIds = items.map(item => item.id);
      
      // Only show items that are truly missing (not in the items list)
      const trulyMissing = missingItemsFromApi.filter((item: MissingItem) => 
        !itemsWithTagIds.includes(item.id)
      );
      
      setMissingItems(trulyMissing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find missing items");
    } finally {
      setLoading(false);
    }
  };

  const [addingTagToItemId, setAddingTagToItemId] = useState<string | null>(null);

  const addTagToItem = async (itemId: string) => {
    if (!selectedTagId) return;

    setAddingTagToItemId(itemId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/inventory/add-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, tagId: selectedTagId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Failed to add tag");
      }

      const data = await response.json();
      
      // Remove the item from missingItems immediately for better UX
      setMissingItems(prev => prev.filter(item => item.id !== itemId));

      // Refresh items by tag to get updated list (this will update cloverItems)
      const refreshedItems = await fetchItemsByTag();
      
      // Re-check for missing items to refresh the list using fresh items
      if (csvData.length > 0 && (referenceMethod === "upc" ? upcColumn : nameColumn)) {
        await findMissingItems(refreshedItems);
      }

      // Re-run matching with fresh items to update matchedItems and unmatchedItems
      // This will move the newly tagged item from unmatched to matched if it matches CSV
      if (csvData.length > 0 && refreshedItems.length > 0 && 
          (referenceMethod === "upc" ? upcColumn : nameColumn)) {
        await matchItems(refreshedItems);
      }

      setSuccess(`Tag added successfully! Item will now appear in the vendor list.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setAddingTagToItemId(null);
    }
  };

  const matchItems = async (itemsToMatch?: CloverItem[]) => {
    // Use provided items or fall back to state
    const items = itemsToMatch || cloverItems;
    
    if (!selectedTagId || csvData.length === 0 || items.length === 0) {
      setError("Please fetch items by tag first");
      return;
    }

    if (referenceMethod === "upc" && !upcColumn) {
      setError("Please select UPC column");
      return;
    }

    if (referenceMethod === "name" && !nameColumn) {
      setError("Please select Name column");
      return;
    }

    const vendorConfig = getVendorConfig(selectedVendorConfig);
    const matched: MatchedItem[] = [];
    const unmatched: UnmatchedItem[] = [];

    for (const row of csvData) {
      const searchValue = referenceMethod === "upc" 
        ? row[upcColumn]?.trim() 
        : row[nameColumn]?.trim();

      if (!searchValue) {
        // Skip rows without search value but don't count as unmatched
        continue;
      }

      let item = items.find((item) => {
        if (referenceMethod === "upc") {
          // First try matching against SKU
          return item.sku?.trim() === searchValue;
        } else {
          // Name matching - case insensitive, partial match
          return item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                 searchValue.toLowerCase().includes(item.name.toLowerCase());
        }
      });

      // If UPC didn't match SKU, try matching against code
      if (!item && referenceMethod === "upc") {
        item = items.find((item) => {
          return item.code?.trim() === searchValue;
        });
      }

      if (item) {
        // For default vendor, pass the selected stock column name
        let rowForCalculation = { ...row };
        if (selectedVendorConfig === "default" && stockColumn) {
          (rowForCalculation as any)._stockColumnName = stockColumn;
        }
        const calculatedStock = vendorConfig.calculateStock(rowForCalculation);
        // Use itemStock.stockCount if available, otherwise fall back to stockCount
        const currentStock = item.itemStock?.stockCount ?? item.stockCount ?? 0;
        const newStock = currentStock + calculatedStock;

        matched.push({
          csvRow: row,
          item,
          currentStock,
          newStock,
          calculatedStock,
        });
      } else {
        // Item not found in Clover
        unmatched.push({
          csvRow: row,
          searchValue,
          referenceMethod,
        });
      }
    }

    setMatchedItems(matched);
    setUnmatchedItems(unmatched);
  };

  const handleProcessUpdates = async () => {
    if (matchedItems.length === 0) {
      setError("No items to update");
      return;
    }

    if (!confirm(`Are you sure you want to update stock for ${matchedItems.length} items?`)) {
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ itemId: string; itemName: string; error: string }> = [];
    const successes: Array<{ itemId: string; itemName: string; currentStock: number; addedStock: number; newStock: number }> = [];

    for (let i = 0; i < matchedItems.length; i++) {
      const matched = matchedItems[i];
      try {
        const response = await fetch("/api/inventory/update-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: matched.item.id,
            stockCount: matched.newStock,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
          throw new Error(errorMessage);
        }
        successCount++;
        successes.push({
          itemId: matched.item.id,
          itemName: matched.item.name,
          currentStock: matched.currentStock,
          addedStock: matched.calculatedStock,
          newStock: matched.newStock,
        });
        
        // Add delay between requests to avoid rate limiting (429 errors)
        // Wait 200ms between requests to be safer, except for the last one
        if (i < matchedItems.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to update stock for item ${matched.item.id}:`, err);
        errorCount++;
        errors.push({
          itemId: matched.item.id,
          itemName: matched.item.name,
          error: errorMessage,
        });
        
        // If we get a 429 error, wait longer before continuing
        if (err instanceof Error && (err.message.includes("429") || err.message.includes("Too Many Requests"))) {
          console.log("Rate limited, waiting 3 seconds before continuing...");
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    setProcessing(false);
    
    if (errorCount === 0) {
      setSuccess(`Successfully updated stock for ${successCount} items`);
      setTimeout(() => {
        onOpenChange(false);
        if (onComplete) onComplete();
      }, 2000);
    } else {
      // Build detailed success and error messages
      const successDetails = successes.map(s => 
        `${s.itemName}: ${s.currentStock} → ${s.newStock} (+${s.addedStock})`
      ).join("\n");
      
      const errorDetails = errors.map(e => 
        `${e.itemName}: ${e.error}`
      ).join("\n");
      
      const fullMessage = `Updated ${successCount} items successfully:\n${successDetails}\n\nFailed ${errorCount} items:\n${errorDetails}`;
      
      // Store in error state but format it nicely
      setError(fullMessage);
      
      // Also log to console for easy copy-paste
      console.log("=== SUCCESSFULLY UPDATED ===");
      console.log(successDetails);
      console.log("\n=== FAILED TO UPDATE ===");
      console.log(errorDetails);
    }
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTagId(tagId);
    setCloverItems([]);
    setMissingItems([]);
    setMatchedItems([]);
  };

  // Reset all state when modal closes
  const resetState = () => {
    setSelectedTagId("");
    setCsvFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setReferenceMethod("upc");
    setUpcColumn("");
    setNameColumn("");
    setStockColumn("");
    setSelectedVendorConfig("default");
    setCloverItems([]);
    setMissingItems([]);
    setMatchedItems([]);
    setUnmatchedItems([]);
    setError(null);
    setSuccess(null);
    setLoading(false);
    setProcessing(false);
    isProcessingRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  // Auto-fetch items when tag is selected
  useEffect(() => {
    if (selectedTagId && !loading && cloverItems.length === 0) {
      fetchItemsByTag();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagId]);

  // Auto-find missing items when CSV is uploaded and columns are mapped
  useEffect(() => {
    if (
      selectedTagId &&
      csvData.length > 0 &&
      cloverItems.length > 0 &&
      (referenceMethod === "upc" ? upcColumn : nameColumn) &&
      !loading &&
      !isProcessingRef.current
    ) {
      const timer = setTimeout(() => {
        isProcessingRef.current = true;
        findMissingItems().finally(() => {
          isProcessingRef.current = false;
        });
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagId, csvData.length, cloverItems.length, upcColumn, nameColumn, referenceMethod]);

  // Auto-match items when everything is ready
  useEffect(() => {
    if (
      selectedTagId &&
      csvData.length > 0 &&
      cloverItems.length > 0 &&
      (referenceMethod === "upc" ? upcColumn : nameColumn) &&
      (selectedVendorConfig !== "default" || stockColumn) &&
      !loading &&
      !isProcessingRef.current
    ) {
      const timer = setTimeout(() => {
        if (!isProcessingRef.current) {
          isProcessingRef.current = true;
          matchItems();
          // Reset after a short delay to allow state updates
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 100);
        }
      }, 1000); // Wait a bit longer for missing items check to complete
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTagId,
    csvData.length,
    cloverItems.length,
    upcColumn,
    nameColumn,
    referenceMethod,
    selectedVendorConfig,
    stockColumn,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory from CSV</DialogTitle>
          <DialogDescription>
            Upload a vendor CSV file to update inventory stock counts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vendor Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Vendor (Tag)</label>
            <Select value={selectedTagId} onValueChange={handleTagChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTagId && loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading items...</span>
              </div>
            )}
            {selectedTagId && !loading && cloverItems.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {cloverItems.length} items loaded
              </div>
            )}
          </div>

          {/* CSV Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload CSV File</label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              {csvFile && (
                <span className="text-sm text-muted-foreground">{csvFile.name}</span>
              )}
            </div>
          </div>

          {/* Vendor Config Selection */}
          {csvData.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor Stock Calculation</label>
              <Select value={selectedVendorConfig} onValueChange={setSelectedVendorConfig}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vendorConfigs.map((config) => (
                    <SelectItem key={config.name} value={config.name}>
                      {config.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reference Method */}
          {csvHeaders.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Method</label>
              <Select value={referenceMethod} onValueChange={(v) => setReferenceMethod(v as "upc" | "name")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upc">UPC/SKU</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Column Mapping */}
          {csvHeaders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Map CSV Columns</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Stock Column - First, only show if default vendor */}
                {selectedVendorConfig === "default" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock Column (Required)</label>
                    <Select value={stockColumn} onValueChange={setStockColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Reference Column - UPC or Name */}
                {referenceMethod === "upc" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">UPC/SKU Column</label>
                    <Select value={upcColumn} onValueChange={setUpcColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {referenceMethod === "name" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name Column</label>
                    <Select value={nameColumn} onValueChange={setNameColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Missing Items Table */}
          {missingItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items Missing Tag</CardTitle>
                <CardDescription>
                  These items from the CSV don't have the selected tag. Add the tag to include them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Name</TableHead>
                        <TableHead className="w-[30%]">SKU</TableHead>
                        <TableHead className="w-[30%]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.sku || "N/A"}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => addTagToItem(item.id)}
                              disabled={addingTagToItemId === item.id || !!addingTagToItemId}
                            >
                              {addingTagToItemId === item.id ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                "Add Tag"
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matched Items Preview */}
          {matchedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stock Update Preview</CardTitle>
                <CardDescription>
                  Review the stock updates before applying. {matchedItems.length} items matched.
                  {unmatchedItems.length > 0 && (
                    <span className="text-orange-600"> {unmatchedItems.length} items from CSV did not match.</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[50%]">Item Name</TableHead>
                        <TableHead className="w-[15%] text-right">Current</TableHead>
                        <TableHead className="w-[15%] text-right">Adding</TableHead>
                        <TableHead className="w-[20%] text-right">New Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchedItems.map((matched, idx) => (
                        <TableRow key={`${matched.item.id}-${idx}`}>
                          <TableCell className="font-medium">
                            {matched.item.name}
                          </TableCell>
                          <TableCell className="text-right">{matched.currentStock}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            +{matched.calculatedStock}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {matched.newStock}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unmatched Items */}
          {unmatchedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Unmatched Items from CSV</CardTitle>
                <CardDescription>
                  These {unmatchedItems.length} items from your CSV could not be found in Clover. 
                  They may not exist in your inventory or the {referenceMethod === "upc" ? "UPC/SKU" : "name"} doesn't match.
                  {referenceMethod === "upc" && " (Checked against SKU and Code fields)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[30%]">
                          {referenceMethod === "upc" ? "UPC/SKU" : "Name"}
                        </TableHead>
                        <TableHead className="w-[70%]">CSV Row Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmatchedItems.map((unmatched, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-orange-600">
                            {unmatched.searchValue || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {Object.entries(unmatched.csvRow)
                              .filter(([key]) => key !== upcColumn && key !== nameColumn)
                              .slice(0, 3)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ")}
                            {Object.keys(unmatched.csvRow).length > 3 && "..."}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">Update Results</span>
                  </div>
                  <div className="text-sm whitespace-pre-line text-orange-700 dark:text-orange-300 font-mono">
                    {error}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {matchedItems.length > 0 && (
            <Button
              onClick={handleProcessUpdates}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Update ${matchedItems.length} Items`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

