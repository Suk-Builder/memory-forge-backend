.PHONY: help build up down logs migrate seed clean dev test lint

help: ## Show this help
	@echo "Memory Forge Backend — Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs
	docker-compose logs -f api

migrate: ## Run database migrations
	docker-compose run --rm api npx prisma migrate deploy

migrate-dev: ## Run migrations in development mode
	docker-compose run --rm api npx prisma migrate dev

generate: ## Generate Prisma client
	docker-compose run --rm api npx prisma generate

seed: ## Seed database with templates
	docker-compose run --rm api npx prisma db seed

db-reset: ## Reset database (WARNING: deletes all data)
	docker-compose run --rm api npx prisma migrate reset --force

clean: ## Remove all containers and volumes
	docker-compose down -v
	docker system prune -f

psql: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d memoryforge

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

status: ## Check service status
	docker-compose ps
	health_url=$$(docker-compose port api 3000 2>/dev/null | sed 's/0.0.0.0/localhost/'); \
	if [ -n "$$health_url" ]; then \
		curl -s http://$$health_url/health | python3 -m json.tool 2>/dev/null || true; \
	else \
		echo "API not running"; \
	fi

# Development commands (run locally with tsx)
dev: ## Start API in development mode
	cd api && npm run dev

dev-db: ## Start only database services
	docker-compose up -d postgres redis

install: ## Install dependencies
	cd api && npm install

test: ## Run tests
	cd api && npm test

lint: ## Run linter
	cd api && npm run lint
