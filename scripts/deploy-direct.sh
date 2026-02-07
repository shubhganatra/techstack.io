docker compose down
docker compose up -d
sleep 10
docker compose ps#!/bin/bash

# Direct deployment without Docker
# Works on t3.micro + faster + simpler

set -e

echo "🚀 TechStack.Studio Direct Deployment"
echo "======================================"

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.11
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev

# Install Nginx
sudo apt-get install -y nginx

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Setup backend
echo "📦 Setting up backend..."
mkdir -p ~/app
cd ~/app
git clone git@github.com:shubhganatra/TechStack.Studio.git || cd TechStack.Studio && git pull
cd TechStack.Studio/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Setup frontend
echo "📦 Setting up frontend..."
cd ../frontend
npm install
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. SSH into instance"
echo "2. Run: cd ~/app/TechStack.Studio && bash scripts/start-services.sh"
echo ""
