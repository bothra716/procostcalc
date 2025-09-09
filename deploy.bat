@echo off
REM Deployment script for Costing & Inventory Management System
REM Usage: deploy.bat [environment] [action]
REM Environment: dev, staging, prod
REM Action: build, deploy, restart, logs, stop

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev

set ACTION=%2
if "%ACTION%"=="" set ACTION=deploy

echo [%date% %time%] Starting deployment process...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker first.
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found. Creating from template...
    copy env.example .env
    echo [WARNING] Please update .env file with your configuration before deploying.
)

if "%ACTION%"=="build" goto build
if "%ACTION%"=="deploy" goto deploy
if "%ACTION%"=="restart" goto restart
if "%ACTION%"=="logs" goto logs
if "%ACTION%"=="stop" goto stop
if "%ACTION%"=="health" goto health
if "%ACTION%"=="cleanup" goto cleanup
if "%ACTION%"=="backup" goto backup

echo [ERROR] Unknown action: %ACTION%
echo Available actions: build, deploy, restart, logs, stop, health, cleanup, backup
exit /b 1

:build
echo [INFO] Building Docker images...
docker build -f Dockerfile.backend -t costing-backend:latest .
docker build -f Dockerfile.frontend -t costing-frontend:latest .
echo [SUCCESS] Images built successfully
goto end

:deploy
echo [INFO] Deploying application for %ENVIRONMENT% environment...
echo [INFO] Stopping existing containers...
docker-compose down

echo [INFO] Starting services...
docker-compose up -d

echo [INFO] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo [INFO] Running database migrations...
docker-compose exec backend npm run migrate

if "%ENVIRONMENT%"=="dev" (
    echo [INFO] Seeding database with sample data...
    docker-compose exec backend npm run seed
)

echo [SUCCESS] Application deployed successfully
echo [INFO] Frontend: http://localhost:3000
echo [INFO] Backend API: http://localhost:5000
echo [INFO] Database: localhost:5432
goto end

:restart
echo [INFO] Restarting services...
docker-compose restart
echo [SUCCESS] Services restarted
goto end

:logs
echo [INFO] Showing logs for all services...
docker-compose logs -f
goto end

:stop
echo [INFO] Stopping all services...
docker-compose down
echo [SUCCESS] Services stopped
goto end

:health
echo [INFO] Performing health check...
curl -f http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo [ERROR] API health check failed
    exit /b 1
) else (
    echo [SUCCESS] API is healthy
)

curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend health check failed
    exit /b 1
) else (
    echo [SUCCESS] Frontend is healthy
)
goto end

:cleanup
echo [INFO] Cleaning up unused Docker resources...
docker system prune -f
docker volume prune -f
echo [SUCCESS] Cleanup completed
goto end

:backup
echo [INFO] Creating database backup...
set BACKUP_FILE=backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
docker-compose exec postgres pg_dump -U postgres costing_system > %BACKUP_FILE%
echo [SUCCESS] Database backed up to %BACKUP_FILE%
goto end

:end
echo [SUCCESS] Deployment process completed
