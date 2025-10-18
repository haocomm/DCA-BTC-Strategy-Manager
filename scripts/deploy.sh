#!/bin/bash

# DCA Bitcoin Strategy Manager - Production Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="dca-btc-strategy-manager"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate prerequisites
validate_prerequisites() {
    print_status "Validating prerequisites..."

    # Check required commands
    for cmd in docker docker-compose git curl; do
        if command_exists $cmd; then
            print_success "$cmd is installed"
        else
            print_error "$cmd is not installed. Please install it first."
            exit 1
        fi
    done

    # Check if .env.prod exists
    if [ ! -f ".env.prod" ]; then
        print_error ".env.prod file not found. Please copy .env.prod.example and configure it."
        exit 1
    fi

    # Check if SSL certificates exist
    if [ ! -f "./docker/nginx/ssl/cert.pem" ] || [ ! -f "./docker/nginx/ssl/key.pem" ]; then
        print_warning "SSL certificates not found. Generating self-signed certificates..."
        mkdir -p docker/nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout docker/nginx/ssl/key.pem \
            -out docker/nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        print_warning "Self-signed certificates generated. Replace with production certificates."
    fi

    print_success "Prerequisites validated"
}

# Function to backup current deployment
backup_current_deployment() {
    print_status "Creating backup of current deployment..."

    mkdir -p $BACKUP_DIR

    # Backup database
    if docker ps | grep -q dca-postgres-prod; then
        docker exec dca-postgres-prod pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_DIR/database_$(date +%Y%m%d_%H%M%S).sql
        print_success "Database backed up"
    fi

    # Backup configuration
    cp .env.prod $BACKUP_DIR/env_prod_$(date +%Y%m%d_%H%M%S).bak
    print_success "Configuration backed up"

    print_success "Backup completed"
}

# Function to build and deploy
deploy_application() {
    print_status "Building and deploying application..."

    # Pull latest images
    docker-compose -f docker-compose.prod.yml pull

    # Build custom images
    print_status "Building backend image..."
    docker-compose -f docker-compose.prod.yml build backend

    print_status "Building frontend image..."
    docker-compose -f docker-compose.prod.yml build frontend

    # Stop current services
    print_status "Stopping current services..."
    docker-compose -f docker-compose.prod.yml down

    # Run database migrations
    print_status "Running database migrations..."
    docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

    # Start services
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    print_success "Application deployed"
}

# Function to health check
health_check() {
    print_status "Performing health checks..."

    # Wait for services to start
    sleep 30

    # Check backend health
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi

    # Check frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        return 1
    fi

    # Check database connection
    if docker exec dca-postgres-prod pg_isready -U $POSTGRES_USER > /dev/null 2>&1; then
        print_success "Database health check passed"
    else
        print_error "Database health check failed"
        return 1
    fi

    print_success "All health checks passed"
}

# Function to show deployment info
show_deployment_info() {
    print_status "Deployment Information:"
    echo "=================================="
    echo "Frontend URL: https://your-domain.com"
    echo "API URL: https://your-domain.com/api"
    echo "Grafana: http://your-domain.com:3000 (admin:password)"
    echo "Prometheus: http://your-domain.com:9090"
    echo "=================================="

    print_status "Useful commands:"
    echo "- View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "- Check status: docker-compose -f docker-compose.prod.yml ps"
    echo "- Stop services: docker-compose -f docker-compose.prod.yml down"
    echo "- Update services: docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d"
}

# Main deployment function
main() {
    print_status "Starting DCA Bitcoin Strategy Manager deployment..."

    # Load environment variables
    if [ -f ".env.prod" ]; then
        export $(cat .env.prod | grep -v '^#' | xargs)
    fi

    # Create log file
    exec > $LOG_FILE 2>&1

    # Run deployment steps
    validate_prerequisites
    backup_current_deployment
    deploy_application

    if health_check; then
        show_deployment_info
        print_success "🎉 Deployment completed successfully!"
        print_status "Your DCA Bitcoin Strategy Manager is now live!"
    else
        print_error "Deployment failed. Check logs for details."
        print_status "Logs: tail -f $LOG_FILE"
        exit 1
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "validate")
        validate_prerequisites
        ;;
    "backup")
        backup_current_deployment
        ;;
    "health")
        health_check
        ;;
    "logs")
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    "status")
        docker-compose -f docker-compose.prod.yml ps
        ;;
    "stop")
        docker-compose -f docker-compose.prod.yml down
        print_status "Services stopped"
        ;;
    "restart")
        docker-compose -f docker-compose.prod.yml restart
        print_status "Services restarted"
        ;;
    "update")
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml up -d
        print_status "Services updated"
        ;;
    "deploy"|*)
        main
        ;;
esac