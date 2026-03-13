#!/bin/bash
set -e

echo "======================================"
echo " Weather Oracle Local Setup"
echo "======================================"

echo "Waiting for Anvil to start..."
while ! curl -s http://anvil:8545 > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Anvil is up."

echo "Waiting for Graph Node to start..."
RETRIES=0
MAX_RETRIES=30
while ! curl -s http://graph-node:8020 > /dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "❌ Graph Node failed to start after ${MAX_RETRIES} attempts."
    exit 1
  fi
  echo "  Waiting... (attempt $RETRIES/$MAX_RETRIES)"
  sleep 3
done
echo "✅ Graph Node is up."

echo ""
echo "Step 1: Deploying contracts to Anvil..."
cd /app
CONTRACT_OUTPUT=$(npx hardhat run scripts/deploy-local.js --network localhost 2>&1)
echo "$CONTRACT_OUTPUT"

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$CONTRACT_OUTPUT" | grep -o 'WeatherOracle deployed to: 0x[a-fA-F0-9]\{40\}' | awk '{print $4}')

if [ -z "$CONTRACT_ADDRESS" ]; then
  echo "❌ Failed to extract contract address!"
  exit 1
fi

echo ""
echo "✅ Contract deployed at: $CONTRACT_ADDRESS"

echo ""
echo "Step 2: Setting up Subgraph..."
cd /app/subgraph

# Install graph-cli locally for this container
npm install --save-dev @graphprotocol/graph-cli@latest 2>&1

# Make a local copy of subgraph configuration
cp subgraph.yaml subgraph-local.yaml

# Replace the contract address and network in the local config
sed -i "s/address: .*/address: '$CONTRACT_ADDRESS'/g" subgraph-local.yaml
sed -i "s/network: sepolia/network: localhost/g" subgraph-local.yaml
sed -i "s/startBlock: .*/startBlock: 0/g" subgraph-local.yaml

echo "  Creating subgraph in local Graph Node..."
npx graph create --node http://graph-node:8020/ weather-oracle 2>&1 || true

echo "  Generating code and deploying subgraph..."
npx graph codegen subgraph-local.yaml 2>&1
npx graph build subgraph-local.yaml 2>&1
npx graph deploy --node http://graph-node:8020/ --ipfs http://ipfs:5001 weather-oracle subgraph-local.yaml --version-label v0.0.1 2>&1

echo ""
echo "Step 3: Configuring frontend..."
cd /app/frontend
cat > .env.local <<EOF
REACT_APP_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
REACT_APP_SUBGRAPH_URI=http://localhost:8000/subgraphs/name/weather-oracle
EOF

echo ""
echo "======================================"
echo " ✅ Setup Complete!"
echo "======================================"
echo " Contract:  $CONTRACT_ADDRESS"
echo " Subgraph:  http://localhost:8000/subgraphs/name/weather-oracle"
echo " Frontend:  http://localhost:3000"
echo "======================================"
