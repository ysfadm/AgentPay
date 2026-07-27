#!/usr/bin/env bash
# Deploy the three AgentPay Soroban contracts to Stellar Testnet and wire them together.
# Prereqs: stellar CLI (`cargo install --locked stellar-cli`) and an identity:
#   stellar keys generate --global deployer --network testnet --fund
set -euo pipefail

NETWORK="testnet"
SOURCE="${STELLAR_IDENTITY:-deployer}"

echo "==> Building contracts (wasm)"
stellar contract build

# Stellar CLI 23+ builds for the wasm32v1-none target.
WASM_DIR="contracts/target/wasm32v1-none/release"

echo "==> Deploying agent-registry"
REGISTRY_ID=$(stellar contract deploy --wasm "$WASM_DIR/agent_registry.wasm" --source "$SOURCE" --network "$NETWORK")
echo "REGISTRY_ID=$REGISTRY_ID"

echo "==> Deploying delegation-manager"
DELEGATION_ID=$(stellar contract deploy --wasm "$WASM_DIR/delegation_manager.wasm" --source "$SOURCE" --network "$NETWORK")
echo "DELEGATION_ID=$DELEGATION_ID"

echo "==> Deploying marketplace"
MARKETPLACE_ID=$(stellar contract deploy --wasm "$WASM_DIR/marketplace.wasm" --source "$SOURCE" --network "$NETWORK")
echo "MARKETPLACE_ID=$MARKETPLACE_ID"

ADMIN=$(stellar keys address "$SOURCE")
# Set NEXT_PUBLIC_USDC_CONTRACT_ID in your environment (a Testnet SAC you control).
USDC="${NEXT_PUBLIC_USDC_CONTRACT_ID:?Set NEXT_PUBLIC_USDC_CONTRACT_ID before running}"

echo "==> Initializing contracts"
stellar contract invoke --id "$REGISTRY_ID" --source "$SOURCE" --network "$NETWORK" -- \
  init --admin "$ADMIN" --marketplace "$MARKETPLACE_ID"
stellar contract invoke --id "$DELEGATION_ID" --source "$SOURCE" --network "$NETWORK" -- \
  init --admin "$ADMIN" --marketplace "$MARKETPLACE_ID"
stellar contract invoke --id "$MARKETPLACE_ID" --source "$SOURCE" --network "$NETWORK" -- \
  init --admin "$ADMIN" --registry "$REGISTRY_ID" --delegation "$DELEGATION_ID" --token "$USDC"

echo ""
echo "==> Done. Add these to .env.local:"
echo "NEXT_PUBLIC_AGENT_REGISTRY_ID=$REGISTRY_ID"
echo "NEXT_PUBLIC_DELEGATION_MANAGER_ID=$DELEGATION_ID"
echo "NEXT_PUBLIC_MARKETPLACE_ID=$MARKETPLACE_ID"
