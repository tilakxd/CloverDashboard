# VPS Deployment Guide

Complete guide for deploying Clover Dashboard on a VPS (Virtual Private Server) like DigitalOcean, Linode, AWS EC2, or any Ubuntu/Debian server.

## Prerequisites

- VPS with Ubuntu 22.04 LTS (or Debian 11+)
- Root or sudo access
- Domain name pointing to your VPS IP (optional but recommended for SSL)
- At least 1GB RAM, 1 CPU core, 20GB storage
- SSH access to your server

## Step 1: Initial Server Setup

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

## Step 9: Set Up Nginx (Reverse Proxy)

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

**Important**: Pushing to `master` does NOT automatically update your VPS. You need to manually update or set up auto-deployment.

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

### Auto-Deployment with GitHub Actions

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
     - `VPS_SSH_KEY`: Your private SSH key

3. **Set up SSH key on VPS**:
```bash
# On your VPS, add the public key to authorized_keys
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key here
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## Alternative: Using systemd Instead of PM2

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

## Backup Strategy

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

## Log Rotation

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

## Monitoring

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

## Troubleshooting

### App won't start
```bash
# Check PM2 logs
pm2 logs clover-dashboard

# Check systemd logs
sudo journalctl -u clover-dashboard -f

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
- [ ] Regular backups configured
- [ ] System updates automated
- [ ] SSH key authentication (disable password auth)
- [ ] Fail2ban installed (optional but recommended)

## Cost Estimate

- **VPS**: $5-10/month (DigitalOcean, Linode, Vultr)
- **Domain**: $10-15/year
- **Total**: ~$5-10/month

This is much cheaper than managed hosting platforms!

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CLOVER_MERCHANT_ID` | Your Clover merchant ID | `ABC123XYZ` |
| `CLOVER_API_KEY` | Your Clover API key | `a1b2c3d4-e5f6-...` |
| `NODE_ENV` | Environment mode | `production` |

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

## Support

For deployment issues:
1. Check error logs (PM2, Nginx, PostgreSQL)
2. Verify environment variables
3. Test database connection
4. Check firewall rules
5. Review this guide step-by-step

---

**Note**: Always test thoroughly in a staging environment before deploying to production!

