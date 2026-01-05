# Clover Inventory Dashboard

A modern Next.js dashboard for managing Clover inventory items with real-time synchronization and advanced filtering.

## Features

- 📊 Real-time inventory data from Clover API
- 🗄️ PostgreSQL database caching for fast performance
- 🎨 Beautiful UI with shadcn/ui components
- 🔍 Advanced filtering (search, category, stock status, price range, tags)
- 📱 Responsive design
- 🔄 Manual sync options
- 🏷️ Tag-based filtering and organization
- 📦 **Add Inventory from Vendor CSV** - Upload vendor CSV files to update stock counts
- 🏪 **Vendor Configuration System** - Custom stock calculation logic per vendor
- ➕ **Tag Management** - Add tags to items that are missing vendor tags
- 📈 **Accurate Stock Counts** - Uses `itemStock.stockCount` for precise inventory tracking

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `CLOVER_MERCHANT_ID`: Your Clover merchant ID
- `CLOVER_API_KEY`: Your Clover API key

### 3. Set Up Database

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev --name init
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the dashboard.

### 6. Initial Sync

Click the "Sync Now" button to fetch all inventory items from Clover.

**Note**: The sync process now uses `expand=itemStock` to get accurate stock counts. The stock count is read from `itemStock.stockCount` when available, falling back to the top-level `stockCount` field.

## Add Inventory Feature

The dashboard includes a powerful "Add Inventory" feature that allows you to:

1. **Select a Vendor Tag** - Choose a vendor tag to filter items
2. **Upload CSV File** - Upload a vendor CSV with inventory data
3. **Configure Columns** - Map CSV columns to UPC/Name and Stock
4. **Match Items** - Automatically match CSV rows to Clover items
5. **Add Missing Tags** - Add vendor tags to items that don't have them yet
6. **Update Stock** - Bulk update stock counts based on CSV data

### Vendor Configuration

The system supports custom stock calculation logic per vendor. See `VENDOR_CONFIG_GUIDE.md` for details on configuring vendor-specific calculations.

### Stock Count Accuracy

The system now properly handles Clover's stock count structure:
- When `expand=itemStock` is used, stock is read from `itemStock.stockCount`
- Falls back to top-level `stockCount` if `itemStock` is not available
- All sync operations use the correct stock count source

## Project Structure

```
/app
  /api
    /sync                      # Sync inventory from Clover
    /items                     # Fetch items with filtering
    /tags                      # Fetch tags from Clover API
    /inventory
      /add-tag                 # Add tag to item endpoint
      /items-by-tag            # Fetch items by tag with stock
      /find-missing-items      # Find items missing tags
      /update-stock            # Update item stock count
  /dashboard                   # Main dashboard page
/components
  /ui                          # shadcn/ui components
  DataTable.tsx               # Inventory data table
  FilterBar.tsx                # Filter controls
  StatsCards.tsx               # Summary statistics
  SyncStatus.tsx               # Sync status and button
  AddInventoryModal.tsx        # Add inventory from CSV modal
  ItemsTable.tsx               # Items table with pagination
/lib
  clover.ts                    # Clover API client
  prisma.ts                    # Prisma client
  vendor-configs.ts            # Vendor stock calculation configs
/prisma
  schema.prisma                # Database schema
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **UI**: shadcn/ui + Tailwind CSS
- **API**: Clover REST API v3

## API Endpoints

- `GET /api/items` - Fetch inventory items with filtering
- `POST /api/sync` - Trigger inventory sync from Clover (uses `expand=itemStock` for accurate stock counts)
- `GET /api/tags` - Fetch tags from Clover API (cached)
- `POST /api/inventory/add-tag` - Add a tag to an item
- `GET /api/inventory/items-by-tag` - Fetch items by tag ID with stock expansion
- `POST /api/inventory/find-missing-items` - Find items in database that don't have a specific tag
- `POST /api/inventory/update-stock` - Update stock count for an item

## Deployment

This application can be deployed to Vercel, AWS, or any Node.js hosting platform.

For Vercel:
```bash
npm install -g vercel
vercel
```

Make sure to set all environment variables in your production environment.

## Recent Updates

- ✅ Fixed stock count display to use `itemStock.stockCount` when available
- ✅ Added vendor CSV upload for inventory updates
- ✅ Implemented tag management for missing vendor tags
- ✅ Added vendor configuration system for custom stock calculations
- ✅ Improved add tag flow with real-time UI updates
- ✅ Fixed SKU unique constraint handling

## Future Enhancements

- Item editing capabilities
- Bulk operations
- Export to CSV/Excel
- Advanced analytics
- Webhook integration for real-time updates
- More vendor configurations

## License

MIT

