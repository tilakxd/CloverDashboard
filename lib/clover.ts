export interface CloverItem {
  id: string;
  name: string;
  price: number;
  priceType?: string;
  defaultTaxRates?: boolean;
  cost?: number;
  isRevenue?: boolean;
  stockCount?: number; // This is often 0, use itemStock.stockCount instead
  available?: boolean;
  code?: string;
  sku?: string;
  modifiedTime?: number;
  hidden?: boolean;
  itemStock?: {
    item: {
      id: string;
    };
    stockCount: number;
    quantity: number;
    modifiedTime: number;
  };
  itemGroup?: {
    id: string;
    name: string;
  };
  categories?: {
    elements: Array<{
      id: string;
      name: string;
    }>;
  };
  tags?: {
    elements: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface CloverApiResponse {
  elements: CloverItem[];
  href?: string;
}

export class CloverAPI {
  private merchantId: string;
  private apiKey: string;
  private baseUrl: string = "https://api.clover.com/v3";

  constructor(merchantId?: string, apiKey?: string) {
    this.merchantId = merchantId || process.env.CLOVER_MERCHANT_ID || "";
    this.apiKey = apiKey || process.env.CLOVER_API_KEY || "";

    if (!this.merchantId || !this.apiKey) {
      throw new Error("Clover merchant ID and API key are required");
    }
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<CloverApiResponse> {
    const url = new URL(`${this.baseUrl}/merchants/${this.merchantId}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Clover API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  private async makePostRequest(
    endpoint: string,
    body: any,
    params: Record<string, string | number> = {}
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}/merchants/${this.merchantId}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Clover API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  private async makePutRequest(
    endpoint: string,
    body: any,
    params: Record<string, string | number> = {}
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}/merchants/${this.merchantId}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Clover API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Fetch all inventory items with pagination
   * The Clover API limits responses to 1000 items per request
   */
  async fetchAllItems(): Promise<CloverItem[]> {
    const allItems: CloverItem[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.makeRequest("/items", {
          limit,
          offset,
          expand: "categories,tags",
        });

        const items = response.elements || [];
        allItems.push(...items);

        // If we got fewer items than the limit, we've reached the end
        hasMore = items.length === limit;
        offset += limit;

        // Add a small delay to avoid rate limiting
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error fetching items at offset ${offset}:`, error);
        throw error;
      }
    }

    return allItems;
  }

  /**
   * Fetch items with custom pagination parameters
   */
  async fetchItems(
    limit: number = 100,
    offset: number = 0
  ): Promise<CloverApiResponse> {
    return this.makeRequest("/items", {
      limit,
      offset,
      expand: "categories,tags",
    });
  }

  /**
   * Fetch a single item by ID
   */
  async fetchItem(itemId: string): Promise<CloverItem> {
    const response = await this.makeRequest(`/items/${itemId}`, {
      expand: "categories,tags",
    });
    return response as unknown as CloverItem;
  }

  /**
   * Fetch all tags
   */
  async fetchTags(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.makeRequest("/tags");
      return response.elements || [];
    } catch (error) {
      console.error("Error fetching tags:", error);
      return [];
    }
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest("/items", { limit: 1 });
      return true;
    } catch (error) {
      console.error("Clover API connection test failed:", error);
      return false;
    }
  }

  /**
   * Fetch items by tag ID with stock expansion
   */
  async fetchItemsByTag(tagId: string): Promise<CloverItem[]> {
    try {
      // Construct URL manually to log it
      const url = new URL(`${this.baseUrl}/merchants/${this.merchantId}/tags/${tagId}/items`);
      url.searchParams.append("limit", "1000");
      url.searchParams.append("expand", "itemStock");
      console.log("Fetching items by tag URL:", url.toString());
      
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Clover API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      const items = data.elements || [];
      
      // Log first item to debug stock expansion
      if (items.length > 0) {
        console.log("Sample item from fetchItemsByTag:", JSON.stringify(items[0], null, 2));
        console.log("Has itemStock?", "itemStock" in items[0]);
        console.log("itemStock.stockCount:", items[0].itemStock?.stockCount);
        console.log("Root stockCount:", items[0].stockCount);
      }
      
      return items;
    } catch (error) {
      console.error(`Error fetching items for tag ${tagId}:`, error);
      throw error;
    }
  }

  /**
   * Add a tag to an item
   */
  async addTagToItem(itemId: string, tagId: string): Promise<void> {
    try {
      await this.makePostRequest(`/items/${itemId}/tags/${tagId}`, {});
    } catch (error) {
      console.error(`Error adding tag ${tagId} to item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Update item stock count
   */
  async updateItemStock(itemId: string, stockCount: number): Promise<CloverItem> {
    try {
      const response = await this.makePutRequest(
        `/items/${itemId}`,
        { stockCount },
        {}
      );
      return response as CloverItem;
    } catch (error) {
      console.error(`Error updating stock for item ${itemId}:`, error);
      throw error;
    }
  }
}

// Helper function to create a Clover API instance
export function createCloverClient(merchantId?: string, apiKey?: string): CloverAPI {
  return new CloverAPI(merchantId, apiKey);
}

