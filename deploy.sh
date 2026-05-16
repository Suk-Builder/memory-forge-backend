#!/bin/bash
set -e

echo "===================================="
echo "Memory Forge Backend Deployment"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check environment
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo -e "${YELLOW}Warning: DEEPSEEK_API_KEY not set. Chat will use mock responses.${NC}"
fi

if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="memory-forge-$(date +%s)-$(openssl rand -hex 16)"
  echo -e "${YELLOW}Warning: JWT_SECRET not set. Generated temporary secret.${NC}"
fi

# Pull latest images
echo -e "${GREEN}[1/6] Pulling latest images...${NC}"
docker-compose pull 2>/dev/null || true

# Build API
echo -e "${GREEN}[2/6] Building API...${NC}"
docker-compose build api

# Start services
echo -e "${GREEN}[3/6] Starting services...${NC}"
docker-compose up -d postgres redis

# Wait for PostgreSQL
echo -e "${GREEN}[4/6] Waiting for PostgreSQL...${NC}"
for i in {1..30}; do
  if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

# Run migrations
echo -e "${GREEN}[5/6] Running database migrations...${NC}"
docker-compose run --rm api npx prisma migrate deploy

# Start all services
echo -e "${GREEN}[6/6] Starting all services...${NC}"
docker-compose up -d

# Seed templates
echo -e "${GREEN}[Bonus] Seeding templates...${NC}"
docker-compose run --rm api npx prisma db seed || echo "Seed skipped or already seeded"

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}API: http://localhost:3000${NC}"
echo -e "${GREEN}Health: http://localhost:3000/health${NC}"
echo -e "${GREEN}====================================${NC}"
