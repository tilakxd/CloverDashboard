# Clover Inventory Dashboard

A modern Next.js dashboard for managing Clover inventory items with real-time synchronization and advanced filtering.

## Features

- 📊 Real-time inventory data from Clover API
- 🗄️ PostgreSQL database caching for fast performance
- 🔒 Simple password authentication
- 🎨 Beautiful UI with shadcn/ui components
- 🔍 Advanced filtering (search, category, stock status, price range, tags)
- 📱 Responsive design
- 🔄 Manual sync options
- 🏷️ Tag-based filtering and organization

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
- `DASHBOARD_PASSWORD`: Password to access the dashboard
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

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

After logging in, click the "Sync Now" button to fetch all inventory items from Clover.

## Project Structure

```
/app
  /api
    /auth/[...nextauth]  # Authentication endpoints
    /sync               # Sync inventory from Clover
    /items              # Fetch items with filtering
    /tags               # Fetch tags from Clover API
  /dashboard            # Main dashboard page
  /login                # Login page
/components
  /ui                   # shadcn/ui components
  DataTable.tsx         # Inventory data table
  FilterBar.tsx         # Filter controls
  StatsCards.tsx        # Summary statistics
  SyncStatus.tsx        # Sync status and button
/lib
  clover.ts            # Clover API client
  prisma.ts            # Prisma client
  auth.ts              # Auth configuration
/prisma
  schema.prisma        # Database schema
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: NextAuth.js v5
- **API**: Clover REST API v3

## API Endpoints

- `GET /api/items` - Fetch inventory items with filtering
- `POST /api/sync` - Trigger inventory sync from Clover
- `GET /api/tags` - Fetch tags from Clover API (cached)
- `POST /api/auth/*` - Authentication endpoints

## Deployment

This application can be deployed to Vercel, AWS, or any Node.js hosting platform.

For Vercel:
```bash
npm install -g vercel
vercel
```

Make sure to set all environment variables in your production environment.

## Future Enhancements

- Item editing capabilities
- Bulk operations
- Export to CSV/Excel
- Advanced analytics
- Webhook integration for real-time updates

## License

MIT

