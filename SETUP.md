# Clover Dashboard Setup Guide

This guide will walk you through setting up the Clover Inventory Dashboard on your local machine.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Clover Merchant ID and API Key

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The project needs environment variables to connect to your database and Clover API. You'll need to manually create a `.env` file in the root directory with the following content:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/clover_dashboard"

# Clover API Credentials
CLOVER_MERCHANT_ID="your_merchant_id_here"
CLOVER_API_KEY="your_api_key_here"

# Authentication
DASHBOARD_PASSWORD="your_secure_password_here"
NEXTAUTH_SECRET="your_generated_secret_here"
NEXTAUTH_URL="http://localhost:3000"
```

#### Getting Your Clover Credentials:

1. Log in to your Clover Dashboard
2. Navigate to Developer Settings
3. Create a new API token or use an existing one
4. Copy your Merchant ID and API Key

#### Generate NextAuth Secret:

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `NEXTAUTH_SECRET`.

### 3. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
# Create a new database
createdb clover_dashboard
```

Update your `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://yourusername:yourpassword@localhost:5432/clover_dashboard"
```

#### Option B: Cloud PostgreSQL (Recommended for Production)

Popular options:
- [Supabase](https://supabase.com) (Free tier available)
- [Neon](https://neon.tech) (Free tier available)
- [Railway](https://railway.app) (Free tier available)
- [Heroku Postgres](https://www.heroku.com/postgres)

After creating your database, copy the connection string to your `.env` file.

### 4. Run Database Migrations

This creates the necessary tables in your database:

```bash
npm run db:migrate
```

When prompted, give your migration a name (e.g., "init").

### 5. Generate Prisma Client

```bash
npm run db:generate
```

### 6. Start the Development Server

```bash
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000).

### 7. First Login

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. You'll be redirected to the login page
3. Enter the password you set in `DASHBOARD_PASSWORD`
4. After login, you'll see the dashboard

### 8. Initial Data Sync

1. Click the "Sync Now" button in the dashboard
2. This will fetch all inventory items from your Clover account
3. The sync may take a few minutes if you have many items
4. Once complete, you'll see all your items in the table

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify your `DATABASE_URL` is correct
2. Ensure PostgreSQL is running (if using local database)
3. Check that the database exists
4. Verify your username and password are correct

### Clover API Errors

If the sync fails:

1. Verify your `CLOVER_MERCHANT_ID` and `CLOVER_API_KEY` are correct
2. Ensure your API key has permission to read inventory items
3. Check that your API key hasn't expired

### Authentication Issues

If you can't log in:

1. Verify `DASHBOARD_PASSWORD` is set in `.env`
2. Ensure `NEXTAUTH_SECRET` is properly generated
3. Clear your browser cookies and try again

## Additional Commands

```bash
# View database in browser
npm run db:studio

# Push schema changes without migrations
npm run db:push

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Next Steps

- Deploy to Vercel or your preferred platform
- Customize filters and views to your needs

## Support

For issues or questions:
1. Check the main [README.md](README.md) for more details
2. Review the [Clover API Documentation](https://docs.clover.com)
3. Check Next.js and Prisma documentation

## Security Notes

- Never commit your `.env` file to version control
- Use strong passwords for `DASHBOARD_PASSWORD`
- Rotate your API keys regularly
- Use HTTPS in production (automatically handled by Vercel/Netlify)

