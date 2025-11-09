#!/bin/bash

# Vercel Postgres Setup Script
# This script automates the creation of Vercel Postgres database and environment setup

set -e

echo "🚀 Vercel Postgres Setup for task-app"
echo "======================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Step 1: Login to Vercel
echo "📝 Step 1: Vercel Login"
echo "Please login to your Vercel account..."
vercel login

# Step 2: Link project
echo ""
echo "🔗 Step 2: Link Project"
if [ ! -f ".vercel/project.json" ]; then
    echo "Linking project to Vercel..."
    vercel link
else
    echo "✅ Project already linked"
fi

# Read project info
PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId": "[^"]*' | cut -d'"' -f4)
TEAM_ID=$(cat .vercel/project.json | grep -o '"orgId": "[^"]*' | cut -d'"' -f4)

echo "Project ID: $PROJECT_ID"
echo "Team ID: $TEAM_ID"

# Step 3: Get Vercel token
echo ""
echo "🔑 Step 3: Get Vercel Token"
echo "Please create a Vercel API token at: https://vercel.com/account/tokens"
echo "Token name suggestion: task-app-setup"
echo "Scope: Full Account"
echo ""
read -p "Enter your Vercel API token: " VERCEL_TOKEN

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Token is required"
    exit 1
fi

# Step 4: Create Postgres Database
echo ""
echo "🗄️  Step 4: Create Postgres Database"
read -p "Enter database name (default: taskapp-db): " DB_NAME
DB_NAME=${DB_NAME:-taskapp-db}

read -p "Enter region (default: iad1 - Washington D.C.): " REGION
REGION=${REGION:-iad1}

echo "Creating Postgres database: $DB_NAME in region: $REGION..."

RESPONSE=$(curl -s -X POST "https://api.vercel.com/v1/storage/stores" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$DB_NAME\",
    \"type\": \"postgres\",
    \"region\": \"$REGION\"
  }")

echo "Response: $RESPONSE"

# Extract database ID
STORE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$STORE_ID" ]; then
    echo "⚠️  Database might already exist or there was an error"
    echo "Checking existing databases..."

    STORES=$(curl -s "https://api.vercel.com/v1/storage/stores" \
      -H "Authorization: Bearer $VERCEL_TOKEN")

    echo "$STORES" | grep -o '"name":"[^"]*' | cut -d'"' -f4

    read -p "Enter existing database ID (or press Enter to continue): " STORE_ID

    if [ -z "$STORE_ID" ]; then
        echo "❌ Cannot proceed without database ID"
        exit 1
    fi
fi

echo "✅ Database ID: $STORE_ID"

# Step 5: Connect database to project
echo ""
echo "🔌 Step 5: Connect Database to Project"

CONNECT_RESPONSE=$(curl -s -X POST "https://api.vercel.com/v1/storage/stores/$STORE_ID/connect" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\"
  }")

echo "Connect Response: $CONNECT_RESPONSE"

# Step 6: Set environment variables
echo ""
echo "🔧 Step 6: Setting Environment Variables"

# Set NODE_ENV
vercel env add NODE_ENV production --force << EOF
production
EOF

# Set JWT_SECRET
JWT_SECRET=$(cat .env.production | grep JWT_SECRET | cut -d'=' -f2)
echo "production" | vercel env add JWT_SECRET --force << EOF
$JWT_SECRET
EOF

# Set DATABASE_URL to reference POSTGRES_PRISMA_URL
echo "production" | vercel env add DATABASE_URL --force << EOF
\${POSTGRES_PRISMA_URL}
EOF

echo "✅ Environment variables set"

# Step 7: Deploy
echo ""
echo "🚀 Step 7: Deploy to Vercel"
read -p "Do you want to deploy now? (y/n): " DEPLOY

if [ "$DEPLOY" = "y" ]; then
    vercel --prod

    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Wait for deployment to finish"
    echo "2. Run database seed:"
    echo "   vercel env pull .env.production.local"
    echo "   npx prisma db seed"
    echo ""
else
    echo "Skipping deployment. You can deploy later with: vercel --prod"
fi

echo ""
echo "✅ Setup complete!"
echo "Visit your Vercel dashboard to verify: https://vercel.com/dashboard"
