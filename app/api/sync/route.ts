import { NextResponse } from "next/server";
import { createCloverClient, type CloverItem } from "@/lib/clover";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Create a sync log entry
    const syncLog = await prisma.syncLog.create({
      data: {
        startTime: new Date(),
        status: "in_progress",
      },
    });

    let itemsFetched = 0;
    let itemsDeleted = 0;
    let error: string | null = null;

    try {
      // Initialize Clover API client
      const cloverClient = createCloverClient();

      // Fetch all items from Clover
      const items = await cloverClient.fetchAllItems();
      itemsFetched = items.length;

      // Create a set of item IDs from Clover for efficient lookup
      const cloverItemIds = new Set(items.map(item => item.id));

      // Upsert items into database
      for (const item of items) {
        const categoryName = item.categories?.elements?.[0]?.name || null;
        const categoryId = item.categories?.elements?.[0]?.id || null;
        // Store tag IDs for reliable filtering (IDs are unique and consistent)
        const tags = item.tags?.elements?.map(tag => tag.id) || [];
        
        // Debug logging for first few items with tags
        if (tags.length > 0) {
          console.log(`Item "${item.name}" has tag IDs:`, tags);
        }

        // Check if item exists by ID first
        const existingItem = await prisma.inventoryItem.findUnique({
          where: { id: item.id },
        });

        // If SKU exists and is different from current item, delete the old one
        if (item.sku) {
          const existingBySku = await prisma.inventoryItem.findUnique({
            where: { sku: item.sku },
          });
          
          if (existingBySku && existingBySku.id !== item.id) {
            await prisma.inventoryItem.delete({
              where: { id: existingBySku.id },
            });
          }
        }

        // Use itemStock.stockCount if available, otherwise fall back to stockCount
        const actualStockCount = item.itemStock?.stockCount ?? item.stockCount ?? 0;

        await prisma.inventoryItem.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            price: item.price || 0,
            priceFormatted: item.price ? `$${(item.price / 100).toFixed(2)}` : null,
            sku: item.sku || null,
            code: item.code || null,
            cost: item.cost || null,
            stockCount: actualStockCount,
            available: item.available ?? true,
            categoryId: categoryId,
            categoryName: categoryName,
            tags: tags,
            modifiedTime: BigInt(item.modifiedTime || Date.now()),
            lastSynced: new Date(),
            updatedAt: new Date(),
          },
          create: {
            id: item.id,
            name: item.name,
            price: item.price || 0,
            priceFormatted: item.price ? `$${(item.price / 100).toFixed(2)}` : null,
            sku: item.sku || null,
            code: item.code || null,
            cost: item.cost || null,
            stockCount: actualStockCount,
            available: item.available ?? true,
            categoryId: categoryId,
            categoryName: categoryName,
            tags: tags,
            modifiedTime: BigInt(item.modifiedTime || Date.now()),
            lastSynced: new Date(),
          },
        });
      }

      // Delete items that exist in database but not in Clover
      const allDbItems = await prisma.inventoryItem.findMany({
        select: { id: true },
      });

      const itemsToDelete = allDbItems.filter(dbItem => !cloverItemIds.has(dbItem.id));
      
      if (itemsToDelete.length > 0) {
        const idsToDelete = itemsToDelete.map(item => item.id);
        await prisma.inventoryItem.deleteMany({
          where: {
            id: {
              in: idsToDelete,
            },
          },
        });
        itemsDeleted = itemsToDelete.length;
        console.log(`Deleted ${itemsDeleted} items that no longer exist in Clover`);
      }

      // Update sync log with success
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          endTime: new Date(),
          itemsFetched,
          status: "success",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${itemsFetched} items${itemsDeleted > 0 ? ` and deleted ${itemsDeleted} removed items` : ""}`,
        itemsFetched,
        itemsDeleted,
        syncId: syncLog.id,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error occurred";

      // Update sync log with error
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          endTime: new Date(),
          itemsFetched,
          status: "error",
          error,
        },
      });

      throw err;
    }
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to sync inventory",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Get the latest sync log
    const latestSync = await prisma.syncLog.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      latestSync,
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sync status",
      },
      { status: 500 }
    );
  }
}

