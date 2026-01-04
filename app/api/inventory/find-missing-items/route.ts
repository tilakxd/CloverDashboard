import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      // Find items by SKU/UPC that don't have the tag
      const items = await prisma.inventoryItem.findMany({
        where: {
          sku: {
            in: upcs,
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
      missingItems = items;
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

