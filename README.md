# Decentralized Weather Oracle & Subgraph

## Overview
This project consists of a Solidity smart contract using Chainlink Any API to fetch weather data, a Subgraph for indexing, and a React frontend.

## Architecture
- **Contract**: `WeatherOracle.sol` handles requests to Chainlink and stores results.
- **Subgraph**: Indexes `WeatherReported` events for efficient historical querying.
- **Frontend**: Connects to MetaMask, requests updates, and displays data from GraphQL.

## Setup Instructions
1. **Contracts**:
   - `npm install`
   - Create `.env` from `.env.example`.
   - `npx hardhat run scripts/deploy.js --network sepolia`
2. **Subgraph**:
   - Update `subgraph.yaml` with your deployed contract address.
   - `graph auth --product hosted-service <ACCESS_TOKEN>`
   - `graph deploy --product hosted-service <USER>/weather-subgraph`
3. **Frontend**:
   - Update `App.js` with your contract address and Subgraph URI.
   - `npm start`

## Testing
Run unit tests with:
`npx hardhat test`