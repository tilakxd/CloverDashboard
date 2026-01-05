# Deployment Guide

This guide covers deploying the Clover Dashboard to various platforms.

## Auto-Deployment Overview

**Does pushing to master automatically update the deployed app?**

- ✅ **Vercel/Railway**: YES - Automatically deploys when you push to the connected branch
- ❌ **VPS (Manual)**: NO - Requires manual update or CI/CD setup
- ✅ **VPS (with GitHub Actions)**: YES - Can be configured for auto-deployment

See the [VPS Auto-Deployment](#auto-deployment-options) section below for setup instructions.

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

**Auto-Deploy**: Railway automatically deploys when you push to the connected branch. No manual intervention needed.

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

## VPS Deployment (Ubuntu/Debian)

This guide covers deploying to a VPS like DigitalOcean, Linode, AWS EC2, or any Ubuntu/Debian server.

### Prerequisites

- VPS with Ubuntu 22.04 LTS (or Debian 11+)
- Root or sudo access
- Domain name pointing to your VPS IP (optional but recommended)
- At least 1GB RAM, 1 CPU core, 20GB storage

### Step 1: Initial Server Setup

1. **Update system packages**:
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Create a non-root user** (if not already done):
```bash
sudo adduser clover
sudo usermod -aG sudo clover
su - clover
```

### Step 2: Install Node.js

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE clover_dashboard;
CREATE USER clover_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE clover_dashboard TO clover_user;
\q
```

### Step 4: Install Git and Clone Repository

```bash
# Install Git
sudo apt install git -y

# Clone your repository
cd ~
git clone https://github.com/your-username/CloverDashboard.git
cd CloverDashboard

# Install dependencies
npm install
```

### Step 5: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following:
```env
DATABASE_URL=postgresql://clover_user:your_secure_password@localhost:5432/clover_dashboard
CLOVER_MERCHANT_ID=your_merchant_id
CLOVER_API_KEY=your_api_key
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 6: Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### Step 7: Build the Application

```bash
# Build for production
npm run build
```

### Step 8: Set Up PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start npm --name "clover-dashboard" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it provides (usually run a sudo command)
```

**PM2 Useful Commands**:
```bash
pm2 status              # Check app status
pm2 logs clover-dashboard  # View logs
pm2 restart clover-dashboard  # Restart app
pm2 stop clover-dashboard     # Stop app
pm2 monit              # Monitor resources
```

### Step 9: Set Up Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/clover-dashboard
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Increase body size for CSV uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/clover-dashboard /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 10: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

### Step 11: Configure Firewall

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install ufw -y

# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

### Step 12: Set Up Automatic Updates (Optional but Recommended)

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades -y

# Configure it
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Step 13: Verify Deployment

1. **Check if the app is running**:
```bash
pm2 status
curl http://localhost:3000
```

2. **Check Nginx**:
```bash
sudo systemctl status nginx
```

3. **Visit your domain** in a browser: `https://your-domain.com`

4. **Run initial sync** from the dashboard

### Step 14: Set Up Log Rotation

Create log rotation config for PM2:
```bash
sudo nano /etc/logrotate.d/pm2
```

Add:
```
/home/clover/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 clover clover
}
```

### Alternative: Using systemd Instead of PM2

If you prefer systemd over PM2:

1. **Create service file**:
```bash
sudo nano /etc/systemd/system/clover-dashboard.service
```

Add:
```ini
[Unit]
Description=Clover Dashboard Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=clover
WorkingDirectory=/home/clover/CloverDashboard
Environment=NODE_ENV=production
EnvironmentFile=/home/clover/CloverDashboard/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. **Enable and start**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable clover-dashboard
sudo systemctl start clover-dashboard
sudo systemctl status clover-dashboard
```

### Updating the Application

**Important**: Pushing to `master` does NOT automatically update your VPS deployment. You need to manually update.

#### Manual Update Process

When you need to update:

```bash
cd ~/CloverDashboard

# Pull latest changes
git pull origin master

# Install new dependencies
npm install

# Run migrations if needed
npx prisma migrate deploy

# Rebuild
npm run build

# Restart with PM2
pm2 restart clover-dashboard

# Or with systemd
sudo systemctl restart clover-dashboard
```

#### Auto-Deployment Options

**Option 1: GitHub Actions (Recommended)**

Set up automatic deployment when you push to master:

1. **Create GitHub Actions workflow**:
```bash
mkdir -p .github/workflows
nano .github/workflows/deploy.yml
```

Add this configuration:
```yaml
name: Deploy to VPS

on:
  push:
    branches: [ master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd ~/CloverDashboard
          git pull origin master
          npm install
          npx prisma migrate deploy
          npm run build
          pm2 restart clover-dashboard
```

2. **Add GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `VPS_HOST`: Your VPS IP or domain
     - `VPS_USER`: Your SSH username (e.g., `clover`)
     - `VPS_SSH_KEY`: Your private SSH key (generate with `ssh-keygen`)

3. **Set up SSH key on VPS**:
```bash
# On your VPS, add the public key to authorized_keys
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key here
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

**Option 2: Webhook Script**

Create a simple webhook endpoint that triggers deployment:

1. **Create deployment script**:
```bash
nano ~/deploy.sh
```

Add:
```bash
#!/bin/bash
cd ~/CloverDashboard
git pull origin master
npm install
npx prisma migrate deploy
npm run build
pm2 restart clover-dashboard
echo "Deployment completed at $(date)"
```

Make executable:
```bash
chmod +x ~/deploy.sh
```

2. **Set up webhook** (using a simple Node.js server or GitHub webhook):
   - GitHub can send webhooks to your server
   - Server receives webhook and runs `~/deploy.sh`

**Option 3: Cron Job (Polling)**

Set up a cron job that checks for updates every few minutes:

```bash
crontab -e
```

Add:
```bash
*/5 * * * * cd ~/CloverDashboard && git fetch && [ $(git rev-parse HEAD) != $(git rev-parse origin/master) ] && git pull origin master && npm install && npx prisma migrate deploy && npm run build && pm2 restart clover-dashboard
```

**Note**: This checks every 5 minutes. Adjust timing as needed.

### Auto-Deployment Comparison

| Method | Auto-Deploy? | Setup Complexity | Best For |
|--------|-------------|------------------|----------|
| **VPS Manual** | ❌ No | Easy | Single developer, infrequent updates |
| **GitHub Actions** | ✅ Yes | Medium | Teams, CI/CD pipeline |
| **Webhook** | ✅ Yes | Medium | Custom automation |
| **Cron Polling** | ✅ Yes (delayed) | Easy | Simple auto-updates |
| **Vercel/Railway** | ✅ Yes | Very Easy | Managed hosting |

**Recommendation**: Use GitHub Actions for VPS auto-deployment. It's reliable, secure, and integrates well with your workflow.

### Backup Strategy

1. **Database Backup Script**:
```bash
nano ~/backup-db.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/clover/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U clover_user clover_dashboard > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
```

Make executable:
```bash
chmod +x ~/backup-db.sh
```

2. **Set up cron job for daily backups**:
```bash
crontab -e
```

Add:
```
0 2 * * * /home/clover/backup-db.sh
```

### Monitoring

1. **Install monitoring tools**:
```bash
# htop for system monitoring
sudo apt install htop -y

# Monitor disk usage
df -h
du -sh ~/CloverDashboard
```

2. **Set up uptime monitoring** (external service):
   - UptimeRobot (free)
   - Pingdom
   - StatusCake

### Troubleshooting

**App won't start**:
```bash
# Check PM2 logs
pm2 logs clover-dashboard

# Check systemd logs
sudo journalctl -u clover-dashboard -f

# Check if port is in use
sudo lsof -i :3000
```

**Database connection issues**:
```bash
# Test PostgreSQL connection
psql -U clover_user -d clover_dashboard -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql
```

**Nginx issues**:
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t
```

### Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Strong database password set
- [ ] Environment variables secured (not in git)
- [ ] Regular backups configured
- [ ] System updates automated
- [ ] SSH key authentication (disable password auth)
- [ ] Fail2ban installed (optional but recommended)

### Cost Estimate

- **VPS**: $5-10/month (DigitalOcean, Linode, Vultr)
- **Domain**: $10-15/year
- **Total**: ~$5-10/month

This is much cheaper than managed hosting platforms!

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Run database migrations
- [ ] Perform initial inventory sync
- [ ] Test all filters and search
- [ ] Test Add Inventory feature with CSV upload
- [ ] Set up SSL certificate (use Let's Encrypt)
- [ ] Configure backup strategy for database
- [ ] Set up monitoring (optional but recommended)
- [ ] Test on mobile devices
- [ ] Configure firewall rules
- [ ] Set up log rotation

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CLOVER_MERCHANT_ID` | Your Clover merchant ID | `ABC123XYZ` |
| `CLOVER_API_KEY` | Your Clover API key | `a1b2c3d4-e5f6-...` |
| `NODE_ENV` | Environment mode | `production` |

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

