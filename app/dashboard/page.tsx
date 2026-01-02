"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { DataTable, type InventoryItem } from "@/components/DataTable";
import { FilterBar, type FilterValues } from "@/components/FilterBar";
import { StatsCards } from "@/components/StatsCards";
import { SyncStatus } from "@/components/SyncStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";

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
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "all",
    stockStatus: "all",
    minPrice: "",
    maxPrice: "",
    available: "",
    tag: "all",
  });

  const fetchItems = useCallback(async () => {
    try {
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

      const response = await fetch(`/api/items?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch items");

      const data = await response.json();
      setItems(data.items);
      setCategories(data.categories);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");

      const data = await response.json();
      // Store tag objects with both id and name
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

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchSyncStatus();
    fetchTags();
  }, []);

  const handleSync = async () => {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Sync failed");

      const data = await response.json();
      
      // Refresh items and sync status
      await fetchItems();
      await fetchSyncStatus();
      
      return data;
    } catch (error) {
      console.error("Sync error:", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  if (loading) {
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
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
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
            onFilterChange={setFilters}
          />

          {/* Data Table */}
          <div className="rounded-lg bg-white dark:bg-slate-800 shadow-sm">
            <DataTable items={items} />
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground py-4">
            <p>Showing {items.length} of {stats.totalItems} items</p>
          </div>
        </div>
      </div>
    </div>
  );
}

