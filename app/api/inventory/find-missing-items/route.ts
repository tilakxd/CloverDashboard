import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fuzzyMatchUPC } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tagId, upcs, names } = body;

    if (!tagId) {
      return NextResponse.json(
        {
          success: false,
          message: "tagId is required",
        },
        { status: 400 }
      );
    }

    if (!upcs && !names) {
      return NextResponse.json(
        {
          success: false,
          message: "Either upcs or names array is required",
        },
        { status: 400 }
      );
    }

    let missingItems: Array<{ id: string; name: string; sku: string | null }> = [];

    if (upcs && Array.isArray(upcs) && upcs.length > 0) {
      // Fetch all items that don't have the tag, then use fuzzy matching
      // This allows us to match UPCs even with formatting differences
      const allItemsWithoutTag = await prisma.inventoryItem.findMany({
        where: {
          NOT: {
            tags: {
              has: tagId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          code: true,
        },
      });

      // Use fuzzy matching to find items that match any of the provided UPCs
      const matchedItems: Array<{ id: string; name: string; sku: string | null }> = [];
      const matchedIds = new Set<string>();

      for (const searchUPC of upcs) {
        if (!searchUPC || !searchUPC.trim()) continue;

        for (const item of allItemsWithoutTag) {
          // Skip if already matched
          if (matchedIds.has(item.id)) continue;

          // Try fuzzy matching against SKU
          if (fuzzyMatchUPC(item.sku, searchUPC)) {
            matchedItems.push({
              id: item.id,
              name: item.name,
              sku: item.sku,
            });
            matchedIds.add(item.id);
            continue;
          }

          // Try fuzzy matching against code if SKU didn't match
          if (fuzzyMatchUPC(item.code, searchUPC)) {
            matchedItems.push({
              id: item.id,
              name: item.name,
              sku: item.sku,
            });
            matchedIds.add(item.id);
          }
        }
      }

      missingItems = matchedItems;
    } else if (names && Array.isArray(names) && names.length > 0) {
      // Find items by name that don't have the tag
      // Use case-insensitive contains matching for each name
      const allItems: Array<{ id: string; name: string; sku: string | null }> = [];
      
      for (const searchName of names) {
        const items = await prisma.inventoryItem.findMany({
          where: {
            name: {
              contains: searchName,
              mode: "insensitive",
            },
            NOT: {
              tags: {
                has: tagId,
              },
            },
          },
          select: {
            id: true,
            name: true,
            sku: true,
          },
        });
        allItems.push(...items);
      }
      
      // Remove duplicates
      const uniqueItems = Array.from(
        new Map(allItems.map((item) => [item.id, item])).values()
      );
      missingItems = uniqueItems;
    }

    return NextResponse.json({
      success: true,
      items: missingItems,
    });
  } catch (error) {
    console.error("Error finding missing items:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to find missing items",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

