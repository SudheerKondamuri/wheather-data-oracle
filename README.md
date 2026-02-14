# Decentralized Weather Oracle & Subgraph

A robust, decentralized weather data oracle built with Chainlink Any API, indexed with The Graph Protocol, and featuring a React frontend.

## Architecture

- **Smart Contract (`WeatherOracle.sol`)**: Handles weather data requests via Chainlink Any API and emits events
- **Subgraph**: Indexes `WeatherReported` events for efficient historical querying using The Graph
- **Frontend**: React application with MetaMask integration for requesting and displaying weather data
- **Docker Environment**: Complete local development environment with Anvil (EVM node)

## Prerequisites

- Node.js v18+ and npm
- MetaMask or another Web3 wallet
- An Infura/Alchemy API key for Sepolia testnet
- LINK tokens on Sepolia (get from [Chainlink Faucet](https://faucets.chain.link/sepolia))
- The Graph account (for subgraph deployment)

## Project Structure

```
.
├── contracts/              # Smart contracts
│   ├── WeatherOracle.sol  # Main oracle contract
│   └── mocks/             # Mock contracts for testing
├── scripts/               # Deployment scripts
├── test/                  # Contract tests
├── subgraph/              # The Graph subgraph
│   ├── schema.graphql     # GraphQL schema
│   ├── subgraph.yaml      # Subgraph manifest
│   └── src/mappings/      # Event handlers
├── frontend/              # React frontend
│   ├── src/
│   ├── public/
│   └── Dockerfile
└── docker-compose.yml     # Local dev environment
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd wheather-data-oracle
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Network RPCs
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Deployment (DO NOT commit your private key!)
PRIVATE_KEY=your_wallet_private_key

# Chainlink Configuration (Sepolia)
LINK_TOKEN_ADDRESS=0x779877A7B0D9E8603169DdbD7836e478b4624789
ORACLE_ADDRESS=0x6090149791d654a61848D98596A87443Fae41992
JOB_ID=ca98366cc3314ed5af205319349ad077
FEE=100000000000000000

# OpenWeatherMap API
OPENWEATHER_API_KEY=your_openweathermap_api_key

# The Graph
GRAPH_ACCESS_TOKEN=your_graph_access_token
SUBGRAPH_NAME=your_username/weather-oracle

# Frontend (update after deployment)
REACT_APP_CONTRACT_ADDRESS=<deployed_contract_address>
REACT_APP_SUBGRAPH_URI=<your_subgraph_endpoint>
```

### 3. Deploy Smart Contracts

**Compile contracts:**
```bash
npm run compile
```

**Run tests:**
```bash
npm test
```

**Deploy to Sepolia:**
```bash
npm run deploy
```

**Important:** After deployment:
1. Note the deployed contract address
2. Fund the contract with LINK tokens: Visit [Chainlink Faucet](https://faucets.chain.link/sepolia)
3. Update your `.env` file with the contract address

### 4. Deploy Subgraph

**Navigate to subgraph directory:**
```bash
cd subgraph
npm install
```

**Update `subgraph.yaml`:**
- Replace `address` with your deployed contract address
- Replace `startBlock` with your deployment block number

**Authenticate with The Graph:**
```bash
npx graph auth --product hosted-service <YOUR_ACCESS_TOKEN>
```

**Deploy to The Graph Hosted Service:**
```bash
npx graph codegen
npx graph build
npx graph deploy --product hosted-service <YOUR_USERNAME>/weather-oracle
```

Or for The Graph Studio:
```bash
npx graph deploy --studio weather-oracle
```

**Note your subgraph endpoint** and update `.env` with it.

### 5. Run Frontend

**Navigate to frontend directory:**
```bash
cd ../frontend
npm install
```

**Configure frontend environment:**
```bash
cp .env.example .env
```

Edit `frontend/.env` with your values:
```env
REACT_APP_CONTRACT_ADDRESS=<your_deployed_contract_address>
REACT_APP_SUBGRAPH_URI=<your_subgraph_graphql_endpoint>
```

**Start the frontend:**
```bash
npm start
```

The app will open at `http://localhost:3000`

### 6. Using Docker (Optional)

Run the complete local development environment:

```bash
# From project root
docker-compose up --build
```

This starts:
- **Anvil**: Local Ethereum node on port 8545
- **Frontend**: React app on port 3000

For local deployment, update your `.env` to use `http://localhost:8545` as RPC_URL.

## Testing

### Unit Tests

```bash
npm test
```

Tests cover:
- `requestWeather` function (LINK balance check, event emission)
- `fulfill` callback (data parsing, storage, event emission)
- Access control (owner-only functions)

### Manual Testing

1. **Connect MetaMask** to Sepolia testnet
2. **Request weather data** via frontend
3. **Wait for Chainlink oracle** to fulfill the request (~1-2 minutes)
4. **View historical data** from the subgraph

## Features

✅ **Chainlink Any API Integration**: Fetches real-world weather data on-chain  
✅ **Payable Request Function**: Covers Chainlink fees  
✅ **Event-Driven Architecture**: Emits `WeatherRequested` and `WeatherReported` events  
✅ **Subgraph Indexing**: Efficient historical data queries via GraphQL  
✅ **React Frontend**: MetaMask integration, balance display, transaction feedback  
✅ **Access Control**: Owner-only configuration updates  
✅ **Comprehensive Tests**: Ethers v6 compatible test suite  
✅ **Docker Support**: One-command local environment setup  
✅ **Environment Configuration**: Secure `.env` based configuration

## API Reference

### Smart Contract

**`requestWeather(string memory _city) public payable`**
- Requests weather data for a city
- Emits `WeatherRequested(bytes32 requestId, string city, address requester)`

**`fulfill(bytes32 _requestId, string memory _weatherData) public`**
- Chainlink callback function
- Emits `WeatherReported(bytes32 requestId, string city, int256 temperature, string description, uint256 timestamp)`

### GraphQL Queries

```graphql
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
```

```graphql
query GetReportsByCity($city: String!) {
  weatherReports(where: { city: $city }) {
    id
    temperature
    description
    timestamp
  }
}
```

## Troubleshooting

**Contract deployment fails:**
- Ensure you have enough ETH on Sepolia
- Check that your `.env` file is properly configured
- Verify your private key is correct (without 0x prefix)

**Chainlink request not fulfilled:**
- Ensure contract has sufficient LINK tokens
- Check Chainlink oracle is operational
- Verify job ID is correct for your network

**Frontend not connecting:**
- Make sure MetaMask is on Sepolia testnet
- Check contract address in frontend `.env`
- Verify subgraph is deployed and accessible

**Subgraph not updating:**
- Confirm contract address and start block are correct in `subgraph.yaml`
- Check subgraph deployment logs for errors
- Verify events are being emitted from contract

## Security Considerations

⚠️ **Never commit `.env` file or private keys to version control**  
⚠️ **Use hardware wallets for mainnet deployments**  
⚠️ **Audit smart contracts before mainnet deployment**  
⚠️ **Implement rate limiting for production**  

## Gas Optimization

The contract uses:
- Solidity optimizer (200 runs)
- Minimal storage operations
- Efficient event emission

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

ISC

## Resources

- [Chainlink Documentation](https://docs.chain.link/)
- [The Graph Documentation](https://thegraph.com/docs/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review Chainlink and The Graph documentation