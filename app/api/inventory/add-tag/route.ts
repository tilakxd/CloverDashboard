import { NextResponse } from "next/server";
import { createCloverClient } from "@/lib/clover";
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

    // Update local Postgres tags array
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (existingItem) {
      const currentTags = existingItem.tags || [];
      if (!currentTags.includes(tagId)) {
        await prisma.inventoryItem.update({
          where: { id: itemId },
          data: {
            tags: [...currentTags, tagId],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tag added successfully",
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

