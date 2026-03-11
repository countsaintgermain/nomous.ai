#!/bin/bash
# deploy.sh
# Automates the deployment of the BeWork website to CloudLinux/Passenger via SSH.
# Requirements: 'vh' SSH alias must be configured.

set -e

echo "🚀 Starting BeWork Website Deployment..."

# 1. Build the Application Locally
echo "📦 Building the Next.js application locally..."
npm run build

# 2. Create the Remote Target Directory (if it does not exist)
echo "📁 Ensuring remote directory exists..."
ssh vh "mkdir -p websites/bework/node"

# 3. Sync Files to the Remote Server
echo "🔄 Syncing files to remote server (excluding node_modules and caches)..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next/cache' ./ vh:websites/bework/node/

# 4. Configure Dependencies and Restart on the Remote Server
echo "⚙️ Configuring dependencies and restarting Passenger on remote server..."
ssh vh "rm -rf websites/bework/node/node_modules && cd websites/bework/node && /home/vh10482/nodevenv/websites/bework/node/24/bin/npm install --omit=dev && rm -f node_modules && cp -r /home/vh10482/nodevenv/websites/bework/node/24/lib/node_modules ./node_modules && rm -f tsconfig.json next-env.d.ts stderr.log && mkdir -p tmp && touch tmp/restart.txt"

echo "✅ Deployment completed successfully! Verifiy at https://new.bework.io"
