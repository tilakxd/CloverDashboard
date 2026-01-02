# Deployment Guide

This guide covers deploying the Clover Dashboard to various platforms.

## Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

### Prerequisites

- GitHub account
- Vercel account (free tier available)
- PostgreSQL database (production)

### Steps

1. **Push your code to GitHub** (if not already done):

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**:

In the Vercel dashboard, add these environment variables:

```
DATABASE_URL=your_production_database_url
CLOVER_MERCHANT_ID=your_merchant_id
CLOVER_API_KEY=your_api_key
DASHBOARD_PASSWORD=your_secure_password
NEXTAUTH_SECRET=your_generated_secret
NEXTAUTH_URL=https://your-app.vercel.app
```

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your application
   - Your app will be live at `https://your-app.vercel.app`

5. **Run Database Migrations**:

After first deployment, you need to run migrations. Install Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel link
vercel env pull .env.local
npx prisma migrate deploy
```

### Vercel Cron Jobs (Optional)

To automatically sync inventory every hour:

1. Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

2. Update your `/api/sync/route.ts` to accept GET requests from Vercel Cron.

## Railway

Railway is another great option with built-in PostgreSQL.

### Steps

1. **Create Railway Account**: [railway.app](https://railway.app)

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will provision a database
   - Copy the `DATABASE_URL` from the database settings

4. **Configure Environment Variables**:

Add all required environment variables in the Railway dashboard.

5. **Deploy**:

Railway will automatically build and deploy your app.

## Docker Deployment

For self-hosted deployments using Docker:

### Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
```

### Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: clover
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: clover_dashboard
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://clover:your_password@postgres:5432/clover_dashboard
      CLOVER_MERCHANT_ID: ${CLOVER_MERCHANT_ID}
      CLOVER_API_KEY: ${CLOVER_API_KEY}
      DASHBOARD_PASSWORD: ${DASHBOARD_PASSWORD}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: http://localhost:3000
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Deploy:

```bash
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
```

## AWS / DigitalOcean / Other Cloud Providers

### General Steps:

1. **Set up a server** (Ubuntu 22.04 recommended)

2. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Install PostgreSQL**:
```bash
sudo apt install postgresql postgresql-contrib
```

4. **Clone and setup**:
```bash
git clone your-repo-url
cd CloverDashboard
npm install
npm run build
```

5. **Set up PM2** (process manager):
```bash
sudo npm install -g pm2
pm2 start npm --name "clover-dashboard" -- start
pm2 startup
pm2 save
```

6. **Set up Nginx** (reverse proxy):
```bash
sudo apt install nginx
```

Create `/etc/nginx/sites-available/clover-dashboard`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **Enable site and restart Nginx**:
```bash
sudo ln -s /etc/nginx/sites-available/clover-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Run database migrations
- [ ] Test login functionality
- [ ] Perform initial inventory sync
- [ ] Test all filters and search
- [ ] Set up SSL certificate (use Let's Encrypt)
- [ ] Configure backup strategy for database
- [ ] Set up monitoring (optional but recommended)
- [ ] Test on mobile devices

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CLOVER_MERCHANT_ID` | Your Clover merchant ID | `ABC123XYZ` |
| `CLOVER_API_KEY` | Your Clover API key | `a1b2c3d4-e5f6-...` |
| `DASHBOARD_PASSWORD` | Password to access dashboard | Strong password |
| `NEXTAUTH_SECRET` | Secret for NextAuth | Generated with openssl |
| `NEXTAUTH_URL` | Full URL of your app | `https://yourdomain.com` |

## Security Best Practices

1. **Always use HTTPS in production**
2. **Rotate API keys regularly**
3. **Use strong passwords**
4. **Enable database backups**
5. **Monitor for suspicious activity**
6. **Keep dependencies updated**
7. **Use environment-specific secrets**
8. **Enable rate limiting** (if using custom hosting)

## Monitoring & Maintenance

### Recommended Tools:

- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry
- **Analytics**: Vercel Analytics, Google Analytics
- **Database Monitoring**: Built-in PostgreSQL tools

### Maintenance Tasks:

- Weekly: Check sync logs for errors
- Monthly: Review and optimize database
- Quarterly: Update dependencies
- As needed: Rotate API keys and secrets

## Troubleshooting

### Build Fails

- Check Node.js version (should be 18+)
- Verify all dependencies are installed
- Check for TypeScript errors

### Database Connection Issues

- Verify `DATABASE_URL` format
- Check database is accessible from deployment environment
- Ensure IP whitelist includes your deployment server

### Sync Failures in Production

- Verify API keys are correctly set
- Check Clover API rate limits
- Review error logs

## Cost Estimates

### Free Tier Options:
- **Vercel**: Free for personal projects
- **Supabase**: Free PostgreSQL (500MB)
- **Railway**: $5/month free credit
- **Neon**: Free PostgreSQL tier

### Paid Options (Approximate):
- **Vercel Pro**: $20/month
- **Railway**: ~$10-20/month
- **AWS/DigitalOcean**: ~$10-30/month

## Support

For deployment issues:
1. Check platform-specific documentation
2. Review error logs
3. Verify environment variables
4. Test locally first

---

**Note**: Always test thoroughly in a staging environment before deploying to production!

