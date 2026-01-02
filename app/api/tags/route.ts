import { NextResponse } from "next/server";
import { createCloverClient } from "@/lib/clover";

export const dynamic = "force-dynamic";

// Cache tags for 5 minutes to reduce API calls
let tagsCache: { data: Array<{ id: string; name: string }>; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(request: Request) {
  try {
    const now = Date.now();
    
    // Return cached tags if still valid
    if (tagsCache && (now - tagsCache.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        tags: tagsCache.data,
        cached: true,
      });
    }

    // Fetch fresh tags from Clover API
    const cloverClient = createCloverClient();
    const tags = await cloverClient.fetchTags();
    
    // Update cache
    tagsCache = {
      data: tags,
      timestamp: now,
    };

    return NextResponse.json({
      tags,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch tags",
        tags: [],
      },
      { status: 500 }
    );
  }
}

