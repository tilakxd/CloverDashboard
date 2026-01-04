"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FilterBar, type FilterValues } from "@/components/FilterBar";
import { StatsCards } from "@/components/StatsCards";
import { SyncStatus } from "@/components/SyncStatus";
import { ItemsTable, type ItemsTableRef } from "@/components/ItemsTable";
import { AddInventoryModal } from "@/components/AddInventoryModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Stats {
  totalItems: number;
  totalStockCount: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface SyncLog {
  id: string;
  startTime: Date;
  endTime: Date | null;
  itemsFetched: number;
  status: string;
  error: string | null;
  createdAt: Date;
}

interface Tag {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalStockCount: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "all",
    stockStatus: "all",
    minPrice: "",
    maxPrice: "",
    available: "",
    tag: "all",
  });
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const itemsTableRef = useRef<ItemsTableRef>(null);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");

      const data = await response.json();
      setTags(data.tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setTags([]);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch("/api/sync");
      if (!response.ok) throw new Error("Failed to fetch sync status");

      const data = await response.json();
      if (data.latestSync) {
        setLastSync(data.latestSync);
      }
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  // Memoize the filter change handler to prevent unnecessary re-renders
  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters((prevFilters) => {
      // Only update if filters actually changed
      const filtersChanged = JSON.stringify(newFilters) !== JSON.stringify(prevFilters);
      if (filtersChanged) {
        return newFilters;
      }
      return prevFilters;
    });
  }, []);

  // Handle stats update from ItemsTable
  const handleStatsUpdate = useCallback((newStats: Stats) => {
    setStats(newStats);
  }, []);

  // Handle categories update from ItemsTable
  const handleCategoriesUpdate = useCallback((newCategories: Category[]) => {
    setCategories(newCategories);
  }, []);

  // Handle sync completion - refresh items table
  const handleSyncComplete = useCallback(() => {
    if (itemsTableRef.current) {
      itemsTableRef.current.refresh();
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([fetchSyncStatus(), fetchTags()]);
      setInitialLoading(false);
    };
    initialize();
  }, []);

  const handleSync = async () => {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Sync failed");

      const data = await response.json();
      
      // Refresh sync status and trigger items table refresh
      await fetchSyncStatus();
      handleSyncComplete();
      
      return data;
    } catch (error) {
      console.error("Sync error:", error);
      throw error;
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-4 md:p-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-4 md:p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Inventory Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your Clover inventory items
              </p>
            </div>
            <Button onClick={() => setInventoryModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Inventory
            </Button>
          </div>

          {/* Sync Status */}
          <SyncStatus lastSync={lastSync} onSync={handleSync} />

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Filters */}
          <FilterBar
            categories={categories}
            tags={tags}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* Data Table */}
          <ItemsTable
            ref={itemsTableRef}
            filters={filters}
            onStatsUpdate={handleStatsUpdate}
            onCategoriesUpdate={handleCategoriesUpdate}
          />

          {/* Add Inventory Modal */}
          <AddInventoryModal
            open={inventoryModalOpen}
            onOpenChange={setInventoryModalOpen}
            tags={tags}
            onComplete={() => {
              if (itemsTableRef.current) {
                itemsTableRef.current.refresh();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

