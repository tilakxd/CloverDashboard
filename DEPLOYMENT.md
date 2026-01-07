# VPS Deployment Guide with Nginx

Complete guide for deploying Clover Dashboard on a VPS (Virtual Private Server) using Nginx as a reverse proxy.

## Prerequisites

- VPS with Ubuntu 22.04 LTS (or Debian 11+)
- Root or sudo access
- Domain name pointing to your VPS IP (optional but recommended for SSL)
- At least 1GB RAM, 1 CPU core, 20GB storage
- SSH access to your server

## Step 1: Initial Server Setup

1. **SSH into your server**:
```bash
ssh user@your-server-ip
```

2. **Update system packages**:
```bash
sudo apt update && sudo apt upgrade -y
```

3. **Create a non-root user** (if not already done):
```bash
sudo adduser clover
sudo usermod -aG sudo clover
su - clover
```

## Step 2: Install Node.js

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 3: Install PostgreSQL

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

## Step 4: Install Git and Clone Repository

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

## Step 5: Configure Environment Variables

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

## Step 6: Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

## Step 7: Build the Application

```bash
# Build for production
npm run build
```

## Step 8: Set Up PM2 (Process Manager)

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

## Step 9: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/clover-dashboard
```

Below is an example that matches your setup:
- Main domain serves a **static landing page**
- `https://your-domain.com/dashboard` serves the **Next.js Clover Dashboard** (running on port **4001**)
- `https://your-domain.com/api` proxies to a **FastAPI backend** (port **8001**)
- HTTP is redirected to HTTPS

Replace `your-domain.com` with your real domain (e.g. `sunshinemarket.shop`), and adjust paths/ports as needed:

```nginx
# ============================
# HTTPS SERVER
# ============================
server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;

    # SSL (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ----------------------------
    # Static landing page (root site)
    # ----------------------------
    location / {
        root /var/www/your_site_root;   # e.g. /var/www/sunshine_market/sunshine-market-web
        index index.html;
        try_files $uri /index.html;
    }

    # ----------------------------
    # Next.js Clover Dashboard at /dashboard
    # ----------------------------
    location /dashboard/ {
        proxy_pass http://127.0.0.1:4001/;  # Next.js app listening on port 4001
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # Increase body size for CSV uploads to the dashboard
        client_max_body_size 10M;
    }

    # ----------------------------
    # FastAPI backend at /api
    # ----------------------------
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        client_max_body_size 50M;
    }
}

# ============================
# HTTP → HTTPS REDIRECT
# ============================
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    return 301 https://$host$request_uri;
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

## Step 10: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

## Step 11: Configure Firewall

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

## Step 12: Verify Deployment

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

## Updating the Application

### Manual Update

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
```

## Troubleshooting

### App won't start
```bash
# Check PM2 logs
pm2 logs clover-dashboard

# Check if port is in use
sudo lsof -i :3000
```

### Database connection issues
```bash
# Test PostgreSQL connection
psql -U clover_user -d clover_dashboard -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Nginx issues
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t
```

### Build fails
```bash
# Check Node.js version
node --version  # Should be 20.x

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Strong database password set
- [ ] Environment variables secured (not in git)
- [ ] SSH key authentication (disable password auth)
- [ ] Regular backups configured

## Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Run database migrations
- [ ] Perform initial inventory sync
- [ ] Test all features including CSV upload
- [ ] Set up SSL certificate (use Let's Encrypt)
- [ ] Configure firewall rules
- [ ] Test on mobile devices

---

**Note**: Always test thoroughly in a staging environment before deploying to production!

