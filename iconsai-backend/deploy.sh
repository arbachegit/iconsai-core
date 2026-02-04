#!/bin/bash
# ==============================================
# IconsAI Backend - Deploy to DigitalOcean Droplet
# ==============================================

set -e

# Configuration - EDIT THESE VALUES
DROPLET_IP="${DROPLET_IP:-YOUR_DROPLET_IP}"
DROPLET_USER="${DROPLET_USER:-root}"
DEPLOY_PATH="/opt/iconsai-backend"
SSH_KEY="${SSH_KEY:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== IconsAI Backend Deploy ===${NC}"
echo "Droplet: $DROPLET_USER@$DROPLET_IP"
echo "Path: $DEPLOY_PATH"
echo ""

# Check if IP is configured
if [ "$DROPLET_IP" = "YOUR_DROPLET_IP" ]; then
    echo -e "${RED}Error: Please set DROPLET_IP${NC}"
    echo "Usage: DROPLET_IP=123.456.789.0 ./deploy.sh"
    exit 1
fi

# SSH options
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
if [ -n "$SSH_KEY" ]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

echo -e "${YELLOW}Step 1: Creating directory on Droplet...${NC}"
ssh $SSH_OPTS $DROPLET_USER@$DROPLET_IP "mkdir -p $DEPLOY_PATH"

echo -e "${YELLOW}Step 2: Copying files to Droplet...${NC}"
rsync -avz --delete \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.git' \
    --exclude '.env' \
    -e "ssh $SSH_OPTS" \
    ./ $DROPLET_USER@$DROPLET_IP:$DEPLOY_PATH/

echo -e "${YELLOW}Step 3: Copying .env file...${NC}"
if [ -f ".env" ]; then
    scp $SSH_OPTS .env $DROPLET_USER@$DROPLET_IP:$DEPLOY_PATH/.env
else
    echo -e "${RED}Warning: .env file not found locally${NC}"
fi

echo -e "${YELLOW}Step 4: Building and starting Docker containers...${NC}"
ssh $SSH_OPTS $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
cd /opt/iconsai-backend

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

# Stop existing containers
docker compose down 2>/dev/null || true

# Build and start
docker compose up -d --build backend

# Check status
sleep 5
docker compose ps
docker compose logs --tail=20

# Health check
echo ""
echo "Testing health endpoint..."
curl -s http://localhost:8000/health || echo "Health check failed"
ENDSSH

echo ""
echo -e "${GREEN}=== Deploy Complete ===${NC}"
echo "Backend URL: http://$DROPLET_IP:8000"
echo "Health: http://$DROPLET_IP:8000/health"
echo "Docs: http://$DROPLET_IP:8000/docs"
echo ""
echo "Next steps:"
echo "1. Configure Nginx reverse proxy for SSL"
echo "2. Point your domain to the Droplet IP"
echo "3. Update frontend VITE_SUPABASE_URL"
