"use client";

import { useState, useEffect } from "react";
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
import { Search, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface FilterBarProps {
  categories: Category[];
  tags: Tag[];
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

export function FilterBar({ categories, tags, onFilterChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "all",
    stockStatus: "all",
    minPrice: "",
    maxPrice: "",
    available: "",
    tag: "all",
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, onFilterChange]);

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
    setFilters(resetFilters);
  };

  const hasActiveFilters =
    filters.search ||
    filters.category !== "all" ||
    filters.stockStatus !== "all" ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.available ||
    filters.tag !== "all";

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
                  placeholder="Search by name, SKU, or code..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters({ ...filters, category: value })
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
                value={filters.stockStatus}
                onValueChange={(value) =>
                  setFilters({ ...filters, stockStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Price */}
            <div>
              <Input
                type="number"
                placeholder="Min Price ($)"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters({ ...filters, minPrice: e.target.value })
                }
                min="0"
                step="0.01"
              />
            </div>

            {/* Max Price */}
            <div>
              <Input
                type="number"
                placeholder="Max Price ($)"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters({ ...filters, maxPrice: e.target.value })
                }
                min="0"
                step="0.01"
              />
            </div>

            {/* Tags */}
            <div>
              <Select
                value={filters.tag}
                onValueChange={(value) =>
                  setFilters({ ...filters, tag: value })
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

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

