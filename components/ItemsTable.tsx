"use client";

import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { DataTable, type InventoryItem } from "@/components/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type FilterValues } from "@/components/FilterBar";

interface ItemsTableProps {
  filters: FilterValues;
  onStatsUpdate?: (stats: {
    totalItems: number;
    totalStockCount: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  }) => void;
  onCategoriesUpdate?: (categories: { id: string; name: string }[]) => void;
}

export interface ItemsTableRef {
  refresh: () => void;
}

export const ItemsTable = forwardRef<ItemsTableRef, ItemsTableProps>(function ItemsTable({ 
  filters, 
  onStatsUpdate, 
  onCategoriesUpdate
}, ref) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStockCount: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.category && filters.category !== "all")
        params.append("category", filters.category);
      if (filters.stockStatus !== "all")
        params.append("stockStatus", filters.stockStatus);
      if (filters.minPrice) params.append("minPrice", filters.minPrice);
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
      if (filters.available) params.append("available", filters.available);
      if (filters.tag && filters.tag !== "all")
        params.append("tag", filters.tag);
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/items?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch items");

      const data = await response.json();
      setItems(data.items);
      setStats(data.stats);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      if (data.categories && onCategoriesUpdate) {
        onCategoriesUpdate(data.categories);
      }
      if (onStatsUpdate) {
        onStatsUpdate(data.stats);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, onStatsUpdate, onCategoriesUpdate]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.category, filters.stockStatus, filters.minPrice, filters.maxPrice, filters.available, filters.tag]);

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: loadItems,
  }), [loadItems]);

  if (loading && items.length === 0) {
    return (
      <div className="rounded-lg bg-white dark:bg-slate-800 shadow-sm">
        <div className="p-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg bg-white dark:bg-slate-800 shadow-sm relative">
        {loading && items.length > 0 && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 flex items-center justify-center z-10 rounded-lg">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}
        <DataTable items={items} />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} items
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (page > 1) {
                  setPage(page - 1);
                }
              }}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (page < pagination.totalPages) {
                  setPage(page + 1);
                }
              }}
              disabled={page >= pagination.totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      {pagination.totalPages <= 1 && (
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Showing {items.length} of {stats.totalItems} items</p>
        </div>
      )}
    </>
  );
});

