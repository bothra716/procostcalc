#!/bin/bash

# Deployment script for Costing & Inventory Management System
# Usage: ./deploy.sh [environment] [action]
# Environment: dev, staging, prod
# Action: build, deploy, restart, logs, stop

set -e

ENVIRONMENT=${1:-dev}
ACTION=${2:-deploy}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        warning ".env file not found. Creating from template..."
        cp env.example .env
        warning "Please update .env file with your configuration before deploying."
    fi
}

# Build images
build_images() {
    log "Building Docker images..."
    
    # Build backend
    log "Building backend image..."
    docker build -f Dockerfile.backend -t costing-backend:latest .
    
    # Build frontend
    log "Building frontend image..."
    docker build -f Dockerfile.frontend -t costing-frontend:latest .
    
    success "Images built successfully"
}

# Deploy application
deploy() {
    log "Deploying application for $ENVIRONMENT environment..."
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose down || true
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose exec backend npm run migrate
    
    # Seed database if development
    if [ "$ENVIRONMENT" = "dev" ]; then
        log "Seeding database with sample data..."
        docker-compose exec backend npm run seed
    fi
    
    success "Application deployed successfully"
    log "Frontend: http://localhost:3000"
    log "Backend API: http://localhost:5000"
    log "Database: localhost:5432"
}

# Restart services
restart() {
    log "Restarting services..."
    docker-compose restart
    success "Services restarted"
}

# Show logs
show_logs() {
    log "Showing logs for all services..."
    docker-compose logs -f
}

# Stop services
stop() {
    log "Stopping all services..."
    docker-compose down
    success "Services stopped"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        error "Some services are not running"
    fi
    
    # Check API health
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        success "API is healthy"
    else
        error "API health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend is healthy"
    else
        error "Frontend health check failed"
    fi
}

# Clean up
cleanup() {
    log "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    success "Cleanup completed"
}

# Backup database
backup_db() {
    log "Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec postgres pg_dump -U postgres costing_system > "$BACKUP_FILE"
    success "Database backed up to $BACKUP_FILE"
}

# Main script
main() {
    log "Starting deployment process..."
    
    check_docker
    check_env
    
    case $ACTION in
        build)
            build_images
            ;;
        deploy)
            build_images
            deploy
            health_check
            ;;
        restart)
            restart
            ;;
        logs)
            show_logs
            ;;
        stop)
            stop
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup
            ;;
        backup)
            backup_db
            ;;
        *)
            error "Unknown action: $ACTION"
            echo "Available actions: build, deploy, restart, logs, stop, health, cleanup, backup"
            ;;
    esac
    
    success "Deployment process completed"
}

# Run main function
main "$@"
