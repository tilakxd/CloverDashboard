import { NextResponse } from "next/server";
import { createCloverClient } from "@/lib/clover";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");

    if (!tagId) {
      return NextResponse.json(
        {
          success: false,
          message: "tagId parameter is required",
        },
        { status: 400 }
      );
    }

    const cloverClient = createCloverClient();
    const items = await cloverClient.fetchItemsByTag(tagId);

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Error fetching items by tag:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch items by tag",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

