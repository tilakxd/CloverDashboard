import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get filter parameters
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const stockStatus = searchParams.get("stockStatus") || "all";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const available = searchParams.get("available");
    const tag = searchParams.get("tag") || "";

    // Build where clause
    const where: any = {};

    // Search filter (name or SKU)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (category && category !== "all") {
      where.categoryId = category;
    }

    // Stock status filter
    if (stockStatus === "in-stock") {
      where.stockCount = { gt: 10 };
    } else if (stockStatus === "low-stock") {
      where.stockCount = { gt: 0, lte: 10 };
    } else if (stockStatus === "less-than-5") {
      where.stockCount = { lt: 5 }; // Includes 0, 1, 2, 3, 4
    } else if (stockStatus === "out-of-stock") {
      where.stockCount = { lte: 0 };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price.gte = parseInt(minPrice) * 100; // Convert to cents
      }
      if (maxPrice) {
        where.price.lte = parseInt(maxPrice) * 100; // Convert to cents
      }
    }

    // Availability filter
    if (available !== null && available !== undefined && available !== "") {
      where.available = available === "true";
    }

    // Tag filter - filter by tag ID
    if (tag && tag !== "all") {
      console.log("Filtering by tag ID:", tag);
      where.tags = {
        has: tag, // Check if the tag ID exists in the tags array
      };
    }

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Execute all queries in parallel for better performance
    const [items, totalCount, categories, stats, lowStockCount, outOfStockCount] = await Promise.all([
      // Fetch items with filters and pagination
      prisma.inventoryItem.findMany({
        where,
        orderBy: {
          name: "asc",
        },
        skip,
        take: limit,
      }),
      
      // Get total count for pagination
      prisma.inventoryItem.count({ where }),
      
      // Get all unique categories for filter dropdown
      prisma.inventoryItem.findMany({
        where: {
          categoryId: { not: null },
        },
        select: {
          categoryId: true,
          categoryName: true,
        },
        distinct: ["categoryId"],
        orderBy: {
          categoryName: "asc",
        },
      }),
      
      // Get summary statistics
      prisma.inventoryItem.aggregate({
        _count: { id: true },
        _sum: {
          stockCount: true,
          price: true,
        },
      }),
      
      // Low stock count
      prisma.inventoryItem.count({
        where: {
          stockCount: { gt: 0, lte: 10 },
        },
      }),
      
      // Out of stock count
      prisma.inventoryItem.count({
        where: {
          stockCount: { lte: 0 },
        },
      }),
    ]);

    return NextResponse.json({
      items: items.map((item: any) => ({
        ...item,
        modifiedTime: item.modifiedTime.toString(),
      })),
      categories: categories.map((cat: any) => ({
        id: cat.categoryId,
        name: cat.categoryName,
      })),
      stats: {
        totalItems: stats._count.id,
        totalStockCount: stats._sum.stockCount || 0,
        totalValue: stats._sum.price || 0,
        lowStockCount,
        outOfStockCount,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch items",
      },
      { status: 500 }
    );
  }
}

