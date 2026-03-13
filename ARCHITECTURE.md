# Architecture Overview

## System Design

The Weather Data Oracle is a 3-layer decentralized application (dApp) that fetches real-world weather data and makes it queryable on-chain.

```
┌─────────────┐     Chainlink       ┌──────────────────┐     Events      ┌────────────────┐
│  Weather API │ ──────────────────▶ │  WeatherOracle   │ ─────────────▶ │  The Graph     │
│  (Off-chain) │   External Adapter  │  (Smart Contract)│                 │  (Subgraph)    │
└─────────────┘                     └──────────────────┘                 └────────────────┘
                                           ▲                                     │
                                           │ Web3 Tx                    GraphQL  │
                                           │                                     ▼
                                    ┌──────────────────┐              ┌────────────────┐
                                    │   MetaMask       │              │  React         │
                                    │   (Wallet)       │◀────────────▶│  Frontend      │
                                    └──────────────────┘              └────────────────┘
```

## Smart Contract Patterns

### Chainlink Any API (Request-Response)
The oracle follows the Chainlink request-response pattern:
1. User calls `requestWeather(city)` → emits `WeatherRequested` event
2. Contract sends a Chainlink request with the city parameter
3. Chainlink node invokes the External Adapter (off-chain)
4. External Adapter calls the weather API, parses JSON, and returns pipe-delimited data
5. Chainlink oracle calls `fulfill(requestId, weatherData)` → emits `WeatherReported` event

### Data Format
The External Adapter returns weather data as a **pipe-delimited string**: `"temperature|description"`.
- Temperature: integer representing Celsius × 100 (e.g., `2050` = 20.50°C)
- Description: plain text weather description (e.g., `"clear sky"`)

This format avoids complex on-chain JSON parsing while maintaining data integrity. The contract's `_parseWeatherData()` function handles parsing, including negative temperatures and edge cases.

### Access Control
- **Ownable** (OpenZeppelin): Owner-only access for `setChainlinkOracle()`, `setJobId()`, `setFee()`, `withdrawLink()`
- **recordChainlinkFulfillment**: Only the registered Chainlink oracle can call `fulfill()`

### Gas Optimization
- Solidity optimizer enabled with 200 runs
- Minimal on-chain storage: only essential fields in `WeatherReport` struct
- Mappings for O(1) lookup of request metadata
- Events used for historical data instead of on-chain arrays (The Graph handles indexing)

## Subgraph Indexing Strategy

### Entity Design
The `WeatherReport` entity is marked as **immutable** (`@entity(immutable: true)`) since weather reports are historical records that should never change once recorded.

### Idempotent Mapping
The mapping function checks for existing entities before creation using `WeatherReport.load(requestId)`, ensuring duplicate event processing doesn't create inconsistent data.

### Indexing Flow
1. `WeatherReported` event is emitted by the smart contract
2. The Graph node detects the event via its configured data source
3. `handleWeatherReported` mapping function processes the event
4. A `WeatherReport` entity is created/updated in the Graph's store
5. The entity becomes queryable via GraphQL

## Frontend Architecture

### Technology Stack
- **React 18** with functional components and hooks
- **Ethers.js v6** for wallet connection and contract interaction
- **Apollo Client** for GraphQL queries to the subgraph
- **Create React App** for build tooling

### Data Flow
- **Write path**: User → MetaMask → `requestWeather()` → Chainlink → `fulfill()`
- **Read path**: Subgraph → Apollo Client → `WeatherReportsList` component
- **Live updates**: Apollo Client's `pollInterval` (5s) ensures new reports appear automatically

## Docker Environment

The `docker-compose.yml` provides a complete local development environment:
- **Anvil**: Local EVM node (Foundry)
- **PostgreSQL + IPFS + Graph Node**: Local subgraph infrastructure
- **Setup container**: Automated contract deployment and subgraph creation
- **Frontend**: React development server

One-command startup: `docker-compose up --build`
