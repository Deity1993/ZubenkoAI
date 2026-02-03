#!/bin/bash
# ZubenkoAI – Deployment-Skript für Ubuntu
# Nutzung: ./deploy.sh [JWT_SECRET]

set -e
JWT_SECRET=${1:-"aendere-mich-in-produktion"}

echo "=== ZubenkoAI Deployment ==="
cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install
cd server && npm install && cd ..

echo "Building frontend..."
npm run build

if [ ! -f server/data/app.db ]; then
  echo "Creating initial user (admin / admin123)..."
  cd server && npm run seed && cd ..
else
  echo "Database exists, skipping seed."
fi

echo ""
echo "Done! Start with:"
echo "  JWT_SECRET=$JWT_SECRET npm run start"
echo ""
echo "Or with PM2:"
echo "  pm2 start 'JWT_SECRET=$JWT_SECRET npm run start' --name zubenkoai"
echo ""
