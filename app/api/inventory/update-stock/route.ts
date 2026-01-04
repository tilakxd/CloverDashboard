import { NextResponse } from "next/server";
import { createCloverClient } from "@/lib/clover";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, stockCount } = body;

    if (!itemId || stockCount === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "itemId and stockCount are required",
        },
        { status: 400 }
      );
    }

    if (typeof stockCount !== "number" || stockCount < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "stockCount must be a non-negative number",
        },
        { status: 400 }
      );
    }

    const cloverClient = createCloverClient();
    
    // Update stock via Clover API
    await cloverClient.updateItemStock(itemId, stockCount);

    // Update local Postgres stockCount
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        stockCount: stockCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Stock updated successfully",
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update stock",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

