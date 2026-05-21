#!/bin/bash
set -e

cd "$(dirname "$0")"

# Load .env if exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "=== AIMood Docker Deploy ==="
echo ""
echo "Stopping existing containers..."
docker compose down 2>/dev/null || true

echo "Building images..."
docker compose build --no-cache

echo "Starting services..."
docker compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check health
echo ""
echo "=== Service Status ==="
docker compose ps

echo ""
echo "Backend health check:"
curl -s http://localhost:3001/api/health || echo "  (waiting for server...)"

echo ""
echo ""
echo "=== Deploy Complete ==="
echo "Frontend: http://localhost:${PORT:-8080}"
echo "Backend:  http://localhost:3001"
echo ""
echo "View logs: docker compose logs -f"
echo "Stop:      docker compose down"
