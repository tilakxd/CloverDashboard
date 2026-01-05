import { NextResponse } from "next/server";
import { createCloverClient, type CloverItem } from "@/lib/clover";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, tagId } = body;

    if (!itemId || !tagId) {
      return NextResponse.json(
        {
          success: false,
          message: "itemId and tagId are required",
        },
        { status: 400 }
      );
    }

    const cloverClient = createCloverClient();
    
    // Add tag to item via Clover API
    await cloverClient.addTagToItem(itemId, tagId);

    // Re-fetch all items from the vendor tag endpoint to get updated data
    console.log(`[add-tag] Re-fetching items for tag ${tagId} after adding tag`);
    const items = await cloverClient.fetchItemsByTag(tagId);
    console.log(`[add-tag] Fetched ${items.length} items from tag endpoint`);

    // Update database with fresh items from the tag endpoint
    for (const item of items) {
      const categoryName = item.categories?.elements?.[0]?.name || null;
      const categoryId = item.categories?.elements?.[0]?.id || null;
      const tags = item.tags?.elements?.map(tag => tag.id) || [];
      
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

    console.log(`[add-tag] Updated ${items.length} items in database`);

    return NextResponse.json({
      success: true,
      message: "Tag added successfully and items refreshed",
      itemsUpdated: items.length,
    });
  } catch (error) {
    console.error("Error adding tag to item:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to add tag to item",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

