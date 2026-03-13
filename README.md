# Decentralized Weather Oracle & Historical Data Subgraph

A robust, decentralized weather data oracle built with **Chainlink Any API**, indexed with **The Graph Protocol**, and featuring a **React** frontend. Fetches real-world weather data on-chain and exposes historical reports through GraphQL queries.

## Architecture

```
  ┌─────────────┐     Chainlink       ┌──────────────────┐     Events      ┌────────────────┐
  │  Weather API │ ──────────────────▶ │  WeatherOracle   │ ─────────────▶ │  The Graph     │
  │  (Off-chain) │   External Adapter  │  (Smart Contract)│                │  (Subgraph)    │
  └─────────────┘                     └──────────────────┘                └────────────────┘
                                             ▲                                    │
                                             │ Web3 Tx                   GraphQL  │
                                             │                                    ▼
                                      ┌──────────────────┐              ┌────────────────┐
                                      │   MetaMask       │              │  React         │
                                      │   (Wallet)       │◀────────────▶│  Frontend      │
                                      └──────────────────┘              └────────────────┘
```

- **Smart Contract (`WeatherOracle.sol`)**: Handles weather data requests via Chainlink Any API, parses pipe-delimited response data, and emits events for indexing
- **Subgraph**: Indexes `WeatherReported` events for efficient historical querying using The Graph
- **Frontend**: React application with MetaMask integration for requesting and displaying weather data
- **Docker Environment**: Complete local development environment with Anvil, Graph Node, IPFS, and PostgreSQL

> For deeper technical details, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [SECURITY.md](./SECURITY.md).

## Prerequisites

- Node.js v18+ and npm
- Docker & Docker Compose (for local environment)
- MetaMask or another Web3 wallet
- An Alchemy/Infura API key for Sepolia testnet
- LINK tokens on Sepolia ([Chainlink Faucet](https://faucets.chain.link/sepolia))
- The Graph Studio account (for subgraph deployment)
- OpenWeatherMap API key ([free sign-up](https://openweathermap.org/appid))

## Project Structure

```
.
├── contracts/                       # Solidity smart contracts
│   ├── WeatherOracle.sol           # Main oracle contract with Chainlink integration
│   └── mocks/
│       └── MockLinkToken.sol       # Mock LINK token for testing
├── scripts/                        # Deployment and interaction scripts
│   ├── deploy.js                   # Deploy to Sepolia testnet
│   ├── deploy-local.js             # Deploy to local Anvil node
│   ├── request-weather.js          # Interact with deployed contract
│   └── setup-local.sh              # Automated local setup (Docker)
├── test/                           # Smart contract tests
│   └── WeatherOracle.test.js       # 30 comprehensive test cases
├── subgraph/                       # The Graph subgraph project
│   ├── schema.graphql              # GraphQL entity definitions
│   ├── subgraph.yaml               # Subgraph manifest (data sources, event handlers)
│   └── src/mappings/
│       └── weather-oracle.ts       # Event mapping logic (idempotent)
├── frontend/                       # React frontend application
│   ├── src/
│   │   ├── App.js                  # Main app with wallet connection
│   │   └── components/
│   │       ├── WeatherForm.js      # Weather request form with tx status
│   │       └── WeatherReportsList.js  # Historical data table from subgraph
│   ├── public/
│   └── Dockerfile
├── .env.example                    # Template for all environment variables
├── docker-compose.yml              # Complete local dev environment
├── ARCHITECTURE.md                 # Detailed design decisions
├── SECURITY.md                     # Self-audit security report
├── hardhat.config.ts               # Hardhat configuration with gas reporter
└── README.md                       # This file
```

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd wheather-data-oracle
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `RPC_URL` | Sepolia RPC endpoint (Alchemy/Infura) |
| `PRIVATE_KEY` | Deployer wallet private key (64-char hex, never commit!) |
| `LINK_TOKEN_ADDRESS` | LINK token address on your network |
| `ORACLE_ADDRESS` | Chainlink oracle address |
| `JOB_ID` | Chainlink job specification ID |
| `FEE` | LINK fee per request (in wei) |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key (for External Adapter) |
| `REACT_APP_CONTRACT_ADDRESS` | Deployed contract address (update after deploy) |
| `REACT_APP_SUBGRAPH_URI` | Subgraph GraphQL endpoint (update after deploy) |

### 3. Compile & Test Smart Contracts

```bash
# Compile contracts
npm run compile

# Run the full test suite (30 tests)
npm test
```

Expected output: `30 passing` with gas usage report.

### 4. Deploy Smart Contracts

**To Sepolia testnet:**
```bash
npm run deploy
```

**To local Anvil (for development):**
```bash
npm run deploy-local
```

After deployment:
1. Note the deployed contract address from the output
2. Fund the contract with LINK tokens: [Chainlink Faucet](https://faucets.chain.link/sepolia)
3. Update `.env` with the new contract address

### 5. Deploy Subgraph

```bash
cd subgraph
npm install
```

**Update `subgraph.yaml`:**
- Set `address` to your deployed contract address
- Set `startBlock` to your deployment block number

**Deploy to The Graph Studio:**
```bash
# Authenticate
npx graph auth --studio <YOUR_DEPLOY_KEY>

# Generate types and build
npx graph codegen
npx graph build

# Deploy
npx graph deploy --studio weather-oracle
```

Note your subgraph's GraphQL endpoint and update `.env` with it.

### 6. Run Frontend

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`. Connect MetaMask to the target network.

### 7. One-Command Docker Setup (Alternative)

For a complete local development environment:

```bash
docker-compose up --build
```

This starts:
- **Anvil**: Local Ethereum node on port 8545
- **PostgreSQL + IPFS + Graph Node**: Local subgraph infrastructure
- **Setup**: Automated contract deployment + subgraph creation
- **Frontend**: React dev server on port 3000

## Testing

### Unit Tests (30 test cases)

```bash
npm test
```

| Category | Tests | Description |
|----------|-------|-------------|
| Deployment | 3 | Constructor validation, zero-address rejection |
| requestWeather | 5 | LINK check, empty city, events, multiple requests |
| fulfill (Parsing) | 8 | Pipe parsing, negative temps, empty data, edge cases |
| Access Control | 8 | Owner-only restrictions for all admin functions |
| LINK Withdrawal | 2 | Successful withdrawal, empty balance revert |
| ETH Handling | 1 | Receive function |

### Gas Report

The gas reporter runs automatically with tests:

| Function | Avg Gas | Notes |
|----------|---------|-------|
| `requestWeather` | ~129,000 | Includes LINK check + Chainlink request |
| `fulfill` | ~121,000 | Includes data parsing + storage + event |
| `withdrawLink` | ~37,000 | LINK transfer to owner |
| `setJobId` / `setFee` | ~29,000 | Simple storage updates |

### Manual Testing

1. Connect MetaMask to Sepolia testnet
2. Request weather data via the frontend form
3. Wait for Chainlink oracle to fulfill (~1-2 minutes)
4. View historical data from the subgraph in the reports table

## Smart Contract: Key Design Decisions

### Data Parsing Strategy
The `fulfill()` function receives weather data as a **pipe-delimited string** (e.g., `"2050|clear sky"`) from the Chainlink External Adapter. The contract's `_parseWeatherData()` function:
- Splits on the `|` delimiter
- Parses the left side as a signed integer (Celsius × 100)
- Extracts the right side as the description string
- Handles edge cases: empty data, missing delimiter, negative temperatures, empty description

### Why Not On-Chain JSON Parsing?
On-chain JSON parsing in Solidity is extremely gas-intensive and complex. The pipe-delimited format is:
- ~10x cheaper in gas costs
- Simpler to implement and audit
- Just as reliable when the External Adapter controls the format

### Chainlink External Adapter
The weather API key is **NOT** stored in the smart contract. It's configured in the Chainlink External Adapter, which:
1. Receives the city parameter from the Chainlink request
2. Calls the weather API (e.g., OpenWeatherMap) with the API key
3. Parses the JSON response
4. Returns the pipe-delimited format to the oracle contract

## GraphQL Query Examples

```graphql
# Get all reports (most recent first)
query GetWeatherReports {
  weatherReports(orderBy: timestamp, orderDirection: desc) {
    id
    city
    temperature
    description
    timestamp
    requester
  }
}

# Filter by city
query GetReportsByCity($city: String!) {
  weatherReports(where: { city: $city }) {
    id
    temperature
    description
    timestamp
  }
}
```

## Security

See [SECURITY.md](./SECURITY.md) for the complete self-audit report.

Key highlights:
- ✅ Access control via OpenZeppelin `Ownable`
- ✅ Chainlink `recordChainlinkFulfillment` for oracle authentication
- ✅ Input validation on all public functions
- ✅ No API keys or secrets in contract code
- ✅ Gas-efficient design with optimizer (200 runs)
- ⚠️ Single oracle trust model (recommended: upgrade to DON for production)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Compile error with PRIVATE_KEY | Ensure `.env` has a valid 64-char hex key, or leave as placeholder (config handles it gracefully) |
| Insufficient LINK | Fund contract via [Chainlink Faucet](https://faucets.chain.link/sepolia) |
| Chainlink request not fulfilled | Verify oracle address, job ID, and that LINK is available |
| Frontend not connecting | Check MetaMask is on the correct network, verify contract address in `.env` |
| Subgraph not updating | Confirm contract address and startBlock in `subgraph.yaml` |
| Docker setup fails | Ensure Docker daemon is running, check port availability (8545, 3000, 8000) |

## Resources

- [Chainlink Any API Documentation](https://docs.chain.link/any-api/introduction)
- [The Graph Documentation](https://thegraph.com/docs/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Ethers.js v6 Documentation](https://docs.ethers.org/v6/)

## License

ISC