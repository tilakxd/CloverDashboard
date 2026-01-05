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

    console.log(`[makePostRequest] URL:`, url.toString());
    console.log(`[makePostRequest] Body:`, JSON.stringify(body, null, 2));

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
      console.error(`[makePostRequest] Error response:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
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

    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    // Only include Content-Type and body if body is not empty
    const hasBody = body && Object.keys(body).length > 0;
    if (hasBody) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
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
          expand: "categories,tags,itemStock",
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
   * Route: /tag_items
   * Method: POST
   * Body: { elements: [{ tag: {id: tagId}, item: {id: itemId} }] }
   */
  async addTagToItem(itemId: string, tagId: string): Promise<void> {
    try {
      const body = {
        elements: [
          {
            tag: { id: tagId },
            item: { id: itemId }
          }
        ]
      };
      
      console.log(`[addTagToItem] Request body:`, JSON.stringify(body, null, 2));
      
      // Clover API uses POST to /tag_items with elements array
      const result = await this.makePostRequest(`/tag_items`, body);
      console.log(`[addTagToItem] Success:`, result);
    } catch (error) {
      console.error(`Error adding tag ${tagId} to item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Update item stock count using item_stocks endpoint
   * Includes retry logic for rate limiting
   */
  async updateItemStock(itemId: string, stockCount: number, retries: number = 3): Promise<void> {
    try {
      const url = new URL(`${this.baseUrl}/merchants/${this.merchantId}/item_stocks/${itemId}`);
      
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: stockCount }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limiting (429) with retry
        if (response.status === 429 && retries > 0) {
          const waitTime = (4 - retries) * 2000; // Exponential backoff: 2s, 4s, 6s
          console.log(`Rate limited, waiting ${waitTime}ms before retry (${retries} retries left)...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.updateItemStock(itemId, stockCount, retries - 1);
        }
        
        // Handle 400 (Bad Request) - might be invalid data
        if (response.status === 400) {
          throw new Error(
            `Bad Request: Invalid stock count or item ID. ${errorText}`
          );
        }
        
        // Handle 500 (Server Error) - Clover API issue
        if (response.status === 500) {
          throw new Error(
            `Clover API server error. Please try again later. ${errorText}`
          );
        }
        
        throw new Error(
          `Clover API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // item_stocks endpoint doesn't return the item, just success
      return;
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

