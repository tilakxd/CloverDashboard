"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Tags {
  tags: Tag[];
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  code: string | null;
  categoryName: string | null;
  tags: string[];
  price: number;
  cost: number | null;
  stockCount: number;
  available: boolean;
  lastSynced: Date;
}

interface FilterBarProps {
  categories: Category[];
  tags: Tag[];
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  search: string;
  category: string;
  stockStatus: string;
  minPrice: string;
  maxPrice: string;
  available: string;
  tag: string;
}

export function FilterBar({ categories, tags, filters, onFilterChange }: FilterBarProps) {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);
  const prevFiltersRef = useRef<string>(JSON.stringify(filters));
  const lastEmittedFiltersRef = useRef<string>(JSON.stringify(filters));

  // Sync local state with prop changes only when parent explicitly resets to default
  useEffect(() => {
    const currentFiltersKey = JSON.stringify(filters);
    const prevFiltersKey = prevFiltersRef.current;
    
    // Only sync if filters changed from parent (e.g., explicit reset)
    if (currentFiltersKey !== prevFiltersKey) {
      const isDefaultState = 
        filters.search === "" &&
        filters.category === "all" &&
        filters.stockStatus === "all" &&
        filters.minPrice === "" &&
        filters.maxPrice === "" &&
        filters.available === "" &&
        filters.tag === "all";
      
      // Only sync if parent reset to default
      if (isDefaultState) {
        setLocalFilters(filters);
        lastEmittedFiltersRef.current = currentFiltersKey;
      }
      prevFiltersRef.current = currentFiltersKey;
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentFiltersKey = JSON.stringify(localFilters);
      const lastEmittedKey = lastEmittedFiltersRef.current;
      
      // Only call onFilterChange if filters actually changed
      if (currentFiltersKey !== lastEmittedKey) {
        lastEmittedFiltersRef.current = currentFiltersKey;
        onFilterChange(localFilters);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFilters.search, localFilters.category, localFilters.stockStatus, localFilters.minPrice, localFilters.maxPrice, localFilters.available, localFilters.tag]);

  const handleReset = () => {
    const resetFilters = {
      search: "",
      category: "all",
      stockStatus: "all",
      minPrice: "",
      maxPrice: "",
      available: "",
      tag: "all",
    };
    setLocalFilters(resetFilters);
  };

  const hasActiveFilters =
    localFilters.search ||
    localFilters.category !== "all" ||
    localFilters.stockStatus !== "all" ||
    localFilters.minPrice ||
    localFilters.maxPrice ||
    localFilters.available ||
    localFilters.tag !== "all";

  const handleExportCSV = async () => {
    try {
      // Build filter params (same as fetchItems but without pagination)
      const params = new URLSearchParams();
      if (localFilters.search) params.append("search", localFilters.search);
      if (localFilters.category && localFilters.category !== "all")
        params.append("category", localFilters.category);
      if (localFilters.stockStatus !== "all")
        params.append("stockStatus", localFilters.stockStatus);
      if (localFilters.minPrice) params.append("minPrice", localFilters.minPrice);
      if (localFilters.maxPrice) params.append("maxPrice", localFilters.maxPrice);
      if (localFilters.available) params.append("available", localFilters.available);
      if (localFilters.tag && localFilters.tag !== "all")
        params.append("tag", localFilters.tag);
      
      // Fetch all items (no pagination limit)
      params.append("limit", "10000"); // Large limit to get all items
      params.append("page", "1");

      const response = await fetch(`/api/items?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch items for export");

      const data = await response.json();
      const exportItems: InventoryItem[] = data.items;

      if (exportItems.length === 0) {
        alert("No items to export with current filters.");
        return;
      }

      // Convert to CSV
      const headers = [
        "Name",
        "SKU",
        "Code",
        "Category",
        "Tags",
        "Price",
        "Cost",
        "Profit Margin (%)",
        "Stock Count",
        "Available",
        "Last Synced",
      ];

      const rows = exportItems.map((item: InventoryItem) => {
        const profitMargin = item.cost && item.price > 0
          ? (((item.price - item.cost) / item.price) * 100).toFixed(2)
          : "";
        
        // const tagsString: string = item.tags && item.tags.length > 0
        //   ? item.tags.map((tagId: string) => {
        //       const tag = tags.find(t => t.id === tagId);
        //       return tag ? tag.name : tagId.split('_').pop() || tagId;
        //     }).join("; ")
        //   : "";
        const tagNames =
  item.tags && item.tags.length > 0
    ? item.tags
        .map((tagId: string) => {
          const matchedTag = tags.find((t: Tag) => t.id === tagId);
          return matchedTag
            ? matchedTag.name
            : tagId.split("_").pop() || tagId;
        })
        .join("; ")
    : "";


        return [
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.sku || ""}"`,
          `"${item.code || ""}"`,
          `"${item.categoryName || ""}"`,
          `"${tagNames.replace(/"/g, '""')}"`,
          (item.price / 100).toFixed(2),
          item.cost ? (item.cost / 100).toFixed(2) : "",
          profitMargin,
          item.stockCount.toString(),
          item.available ? "Yes" : "No",
          formatDate(item.lastSynced)
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.join(","))
      ].join("\n");

      // Create download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      // Generate filename with filter info
      const filterParts: string[] = [];
      if (localFilters.search) filterParts.push(`search-${localFilters.search}`);
      if (localFilters.category && localFilters.category !== "all") {
        const categoryName = categories.find(c => c.id === localFilters.category)?.name || localFilters.category;
        filterParts.push(`category-${categoryName}`);
      }
      if (localFilters.stockStatus !== "all") filterParts.push(`stock-${localFilters.stockStatus}`);
      if (localFilters.tag && localFilters.tag !== "all") {
        const tagName = tags.find(t => t.id === localFilters.tag)?.name || localFilters.tag;
        filterParts.push(`tag-${tagName}`);
      }
      
      const filename = filterParts.length > 0
        ? `inventory-export-${filterParts.join("-")}-${new Date().toISOString().split('T')[0]}.csv`
        : `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export CSV. Please try again.");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Search */}
            <div className="col-span-full md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, SKU, or code..."
                  value={localFilters.search}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, search: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Select
                value={localFilters.category}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Status */}
            <div>
              <Select
                value={localFilters.stockStatus}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, stockStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="less-than-5">Less Than 5</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Price */}
            <div>
              <Input
                type="number"
                placeholder="Min Price ($)"
                value={localFilters.minPrice}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, minPrice: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Price */}
            <div>
              <Input
                type="number"
                placeholder="Max Price ($)"
                value={localFilters.maxPrice}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, maxPrice: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
                min="0"
                step="0.01"
              />
            </div>

            {/* Tags */}
            <div>
              <Select
                value={localFilters.tag}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, tag: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

