# 🚀 DCA Bitcoin Strategy Manager - Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [SSL Configuration](#ssl-configuration)
4. [Deployment Process](#deployment-process)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

## 🔧 Prerequisites

### Required Software
- **Docker** & **Docker Compose** (v20.10+)
- **Git** (v2.0+)
- **OpenSSL** (for SSL certificates)
- **Domain name** (for HTTPS)
- **Server** (VPS or cloud hosting)

### Server Requirements
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 20GB, Recommended 50GB+
- **CPU**: Minimum 2 cores, Recommended 4+
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

## 🛠️ Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/DCA-BTC-Strategy-Manager.git
cd DCA-BTC-Strategy-Manager
```

### 2. Configure Environment Variables
```bash
# Copy production environment template
cp .env.prod.example .env.prod

# Edit the configuration
nano .env.prod
```

**Critical Settings to Update:**
```bash
# Security Secrets (Generate strong values)
JWT_SECRET=your-super-secure-jwt-secret-key
NEXTAUTH_SECRET=your-nextauth-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Domain Configuration
CORS_ORIGIN=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Database Credentials (Generate strong passwords)
POSTGRES_PASSWORD=secure-database-password
REDIS_PASSWORD=secure-redis-password

# Monitoring
GRAFANA_PASSWORD=secure-grafana-password

# Exchange API Keys (Optional - for real trading)
BINANCE_API_KEY=your-binance-api-key
BINANCE_API_SECRET=your-binance-api-secret
```

### 3. SSL Configuration

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./docker/nginx/ssl/key.pem
```

#### Option B: Self-Signed (For Testing)
```bash
# Generate self-signed certificate
mkdir -p docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout docker/nginx/ssl/key.pem \
    -out docker/nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### 4. Update Nginx Configuration
Edit `docker/nginx/nginx.prod.conf`:
```nginx
server_name your-domain.com;  # Replace with your actual domain
```

## 🚀 Deployment Process

### Method 1: Automated Deployment (Recommended)
```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### Method 2: Manual Deployment
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### Method 3: Step-by-Step Deployment
```bash
# 1. Validate environment
./scripts/deploy.sh validate

# 2. Backup any existing data
./scripts/deploy.sh backup

# 3. Deploy application
./scripts/deploy.sh deploy

# 4. Check health status
./scripts/deploy.sh health
```

## 📊 Monitoring Setup

### Grafana Dashboard
- **URL**: `http://your-domain.com:3000`
- **Username**: `admin`
- **Password**: Set in `.env.prod`

### Prometheus Metrics
- **URL**: `http://your-domain.com:9090`
- **Access**: No authentication required

### Key Metrics to Monitor
1. **Application Health**: HTTP response times, error rates
2. **Database Performance**: Connection pool, query times
3. **Redis Performance**: Memory usage, hit rates
4. **System Resources**: CPU, memory, disk usage

### Setting Up Grafana Dashboards
1. Login to Grafana
2. Add Prometheus data source (`http://prometheus:9090`)
3. Import pre-configured dashboards from `docker/grafana/provisioning/`

## 🔧 Post-Deployment Configuration

### 1. Configure DNS Records
```dns
Type    Name                    Value
A       your-domain.com         YOUR_SERVER_IP
A       www.your-domain.com     YOUR_SERVER_IP
```

### 2. Set Up Domain Emails
```bash
# Test email configuration
docker-compose -f docker-compose.prod.yml exec backend npm run test-email
```

### 3. Configure Exchange API Keys
```bash
# Add your exchange API keys to .env.prod
# Test exchange connections
curl -X POST https://your-domain.com/api/exchanges/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Set Up External Integrations
```bash
# TradingView Webhook URL: https://your-domain.com/api/external/tradingview
# n8n Webhook URL: https://your-domain.com/api/external/n8n/trigger-strategy
```

## 🔍 Health Checks

### Automated Health Checks
```bash
# Check all services
./scripts/deploy.sh health

# Check specific service
curl -f https://your-domain.com/health

# View logs
./scripts/deploy.sh logs
```

### Manual Health Checks
```bash
# Application status
docker-compose -f docker-compose.prod.yml ps

# Database connection
docker exec dca-postgres-prod pg_isready -U $POSTGRES_USER

# Redis connection
docker exec dca-redis-prod redis-cli ping

# Nginx status
docker exec dca-nginx-prod nginx -t
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. SSL Certificate Errors
```bash
# Check certificate files
ls -la docker/nginx/ssl/

# Test certificate
openssl x509 -in docker/nginx/ssl/cert.pem -text -noout

# Regenerate if needed
./scripts/generate-ssl.sh
```

#### 2. Database Connection Issues
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test database connection
docker exec dca-postgres-prod psql -U $POSTGRES_USER -d $POSTGRES_DB

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

#### 3. Application Not Starting
```bash
# Check application logs
docker-compose -f docker-compose.prod.yml logs backend

# Check environment variables
docker-compose -f docker-compose.prod.yml exec backend env | grep -v '^PATH'

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### 4. Memory Issues
```bash
# Check system resources
free -h
df -h

# Check Docker resource usage
docker stats

# Clean up unused images
docker system prune -a
```

### Emergency Recovery
```bash
# Stop all services
./scripts/deploy.sh stop

# Restore from backup
docker-compose -f docker-compose.prod.yml up -d postgres
docker exec dca-postgres-prod psql -U $POSTGRES_USER -d $POSTGRES_DB < backup/database.sql

# Restart services
./scripts/deploy.sh deploy
```

## 🔄 Maintenance

### Regular Tasks

#### Daily
```bash
# Check system status
./scripts/deploy.sh status

# Review logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=100

# Monitor disk space
df -h
```

#### Weekly
```bash
# Update SSL certificates
certbot renew

# Backup database
./scripts/deploy.sh backup

# Update application
git pull
./scripts/deploy.sh update
```

#### Monthly
```bash
# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Clean up old logs
find ./logs -name "*.log" -mtime +30 -delete

# Review security updates
docker-compose -f docker-compose.prod.yml exec backend npm audit
```

### Scaling

#### Horizontal Scaling
```yaml
# docker-compose.prod.yml
services:
  backend:
    replicas: 3  # Add multiple instances
    # ... other config
```

#### Resource Scaling
```bash
# Update resource limits
# Edit docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_strategy_timestamp
ON executions(strategy_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategies_user_active
ON strategies(user_id, is_active);
```

### Nginx Optimization
```nginx
# Enable HTTP/2 and other optimizations
listen 443 ssl http2;
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

### Application Optimization
```bash
# Enable Node.js clustering
# Consider using PM2 for process management
npm install -g pm2
```

## 🔐 Security Best Practices

### Regular Security Tasks
1. **Update SSL certificates** (Let's Encrypt auto-renews)
2. **Rotate API keys** quarterly
3. **Review access logs** weekly
4. **Update dependencies** monthly
5. **Security audit** annually

### Security Headers
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=63072000";
```

### Firewall Rules
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 3000/tcp   # Grafana (internal only)
ufw deny 9090/tcp   # Prometheus (internal only)
```

## 📞 Support

### Getting Help
1. Check this documentation first
2. Review logs: `./scripts/deploy.sh logs`
3. Check health: `./scripts/deploy.sh health`
4. Review GitHub Issues

### Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request
4. Follow the code of conduct

---

**🎉 Congratulations! Your DCA Bitcoin Strategy Manager is now deployed and ready for production use!**

For additional support, check the [GitHub repository](https://github.com/your-username/DCA-BTC-Strategy-Manager) or open an issue.