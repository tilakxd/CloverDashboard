"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  priceFormatted: string | null;
  sku: string | null;
  code: string | null;
  cost: number | null;
  stockCount: number;
  available: boolean;
  categoryId: string | null;
  categoryName: string | null;
  tags: string[];
  modifiedTime: string;
  lastSynced: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DataTableProps {
  items: InventoryItem[];
}

export function DataTable({ items }: DataTableProps) {
  const getStockBadge = (stockCount: number) => {
    if (stockCount <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stockCount <= 10) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Low Stock</Badge>;
    } else {
      return <Badge className="bg-green-500 hover:bg-green-600">In Stock</Badge>;
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">No items found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your filters or sync inventory data
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="font-mono text-sm">
                {item.sku || item.code || "-"}
              </TableCell>
              <TableCell>
                {item.categoryName ? (
                  <Badge variant="outline">{item.categoryName}</Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {item.tags && item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tagId, index) => (
                      <Badge key={index} variant="secondary" className="text-xs" title={tagId}>
                        {tagId.split('_').pop() || tagId}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.price)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {item.cost ? formatCurrency(item.cost) : "-"}
              </TableCell>
              <TableCell className="text-center font-medium">
                {item.stockCount}
              </TableCell>
              <TableCell className="text-center">
                {getStockBadge(item.stockCount)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(item.lastSynced)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

