# Weather Oracle - Deployment Checklist

Use this checklist when deploying the Weather Oracle project to ensure everything is properly configured.

## Pre-Deployment Checks

### 1. Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Set `RPC_URL` with your Infura/Alchemy API key
- [ ] Set `PRIVATE_KEY` for deployment wallet (NEVER commit this!)
- [ ] Verify `LINK_TOKEN_ADDRESS` for your target network
- [ ] Verify `ORACLE_ADDRESS` for your target network
- [ ] Verify `JOB_ID` is correct for your Chainlink job
- [ ] Set `FEE` to appropriate LINK amount (default 0.1 LINK)
- [ ] Get OpenWeatherMap API key and update contract or Chainlink job

### 2. Dependencies Installation
```bash
npm install --legacy-peer-deps
cd subgraph && npm install
cd ../frontend && npm install
cd ..
```

### 3. Smart Contract Compilation
```bash
npm run compile
```

### 4. Run Tests
```bash
npm test
```
Expected: All tests should pass

## Smart Contract Deployment

### 1. Deploy to Testnet (Sepolia)
```bash
npm run deploy
```
**SAVE THE CONTRACT ADDRESS!**

### 2. Fund Contract with LINK
- Visit https://faucets.chain.link/sepolia
- Send LINK tokens to your deployed contract address
- Minimum: 0.1 LINK per request

### 3. Verify Contract (Optional but Recommended)
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> \
  <LINK_TOKEN> <ORACLE_ADDRESS> <JOB_ID> <FEE>
```

## Subgraph Deployment

### 1. Update Configuration
- [ ] Edit `subgraph/subgraph.yaml`
- [ ] Replace `address: "0x0000..."` with your deployed contract address
- [ ] Update `startBlock` with your deployment block number

### 2. Authenticate with The Graph
```bash
cd subgraph
npx graph auth --product hosted-service <YOUR_ACCESS_TOKEN>
```

### 3. Generate and Build
```bash
npx graph codegen
npx graph build
```

### 4. Deploy
For Hosted Service:
```bash
npx graph deploy --product hosted-service <USERNAME>/weather-oracle
```

For Studio:
```bash
npx graph deploy --studio weather-oracle
```

**SAVE THE SUBGRAPH ENDPOINT URL!**

## Frontend Deployment

### 1. Configure Environment
```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
- [ ] Set `REACT_APP_CONTRACT_ADDRESS` to deployed contract
- [ ] Set `REACT_APP_SUBGRAPH_URI` to your subgraph endpoint

### 2. Test Locally
```bash
npm start
```
- [ ] Verify wallet connection works
- [ ] Try submitting a weather request (requires LINK in contract)
- [ ] Check that historical data loads from subgraph

### 3. Build for Production
```bash
npm run build
```

### 4. Deploy to Hosting Service
Choose one:
- **Vercel**: `vercel deploy`
- **Netlify**: Deploy `build/` folder
- **IPFS**: Upload `build/` folder
- **S3/CloudFront**: Upload and configure

## Post-Deployment Verification

### 1. Smart Contract
- [ ] Contract is verified on Etherscan
- [ ] Contract has sufficient LINK balance
- [ ] Can call `requestWeather` function
- [ ] Events are emitted correctly

### 2. Subgraph
- [ ] Subgraph is synced and healthy
- [ ] GraphQL playground works
- [ ] Can query `weatherReports`
- [ ] New events are indexed within ~1 minute

### 3. Frontend
- [ ] Website loads without errors
- [ ] MetaMask connects successfully
- [ ] Can submit weather requests
- [ ] Transaction status is displayed
- [ ] Historical data loads and displays
- [ ] Error messages are clear and helpful

## Testing End-to-End Flow

### 1. Request Weather Data
1. Connect wallet with some ETH on Sepolia
2. Enter a city name (e.g., "London")
3. Submit transaction
4. Wait for confirmation

### 2. Wait for Oracle Response
- Typical time: 1-2 minutes
- Check transaction on Etherscan
- Look for `WeatherReported` event

### 3. Verify Data Display
- Check subgraph for new entry (may take ~1 minute)
- Frontend should auto-update (5-second polling)
- Verify data appears in table

## Troubleshooting

### Contract Deployment Fails
- **Insufficient ETH**: Get more from Sepolia faucet
- **Wrong network**: Check MetaMask is on Sepolia
- **Invalid private key**: Check .env format (no 0x prefix)

### Chainlink Request Not Fulfilled
- **Insufficient LINK**: Fund contract with more LINK
- **Wrong job ID**: Verify job ID for your network
- **Oracle offline**: Check Chainlink status page

### Subgraph Not Updating
- **Wrong contract address**: Update subgraph.yaml
- **Wrong startBlock**: Set to deployment block or earlier
- **Events not matching**: Verify event signature in subgraph.yaml

### Frontend Errors
- **Can't connect wallet**: Install MetaMask
- **Wrong network**: Switch to Sepolia in MetaMask
- **Contract interaction fails**: Verify contract address in .env
- **No data loading**: Check subgraph endpoint is correct

## Maintenance

### Regular Checks
- [ ] Monitor LINK balance in contract
- [ ] Check subgraph sync status
- [ ] Review transaction costs
- [ ] Update dependencies for security patches

### Updating Contract
If you need to update the contract:
1. Deploy new version
2. Update subgraph.yaml with new address
3. Redeploy subgraph
4. Update frontend .env
5. Rebuild and redeploy frontend

## Security Reminders

⚠️ **CRITICAL SECURITY PRACTICES**

- [ ] NEVER commit `.env` files
- [ ] Use hardware wallet for mainnet
- [ ] Audit contracts before mainnet deployment
- [ ] Set spending limits in MetaMask
- [ ] Keep private keys in secure password manager
- [ ] Use separate wallets for testing vs production
- [ ] Enable 2FA on all service accounts
- [ ] Regularly rotate API keys

## Cost Estimates (Sepolia Testnet)

- **Contract Deployment**: ~0.01-0.02 ETH
- **LINK per Request**: 0.1 LINK
- **Subgraph Deployment**: Free (hosted service)
- **Frontend Hosting**: Free (Vercel/Netlify)

## Mainnet Considerations

Before deploying to mainnet:

- [ ] Full security audit of smart contracts
- [ ] Extensive testing on testnets
- [ ] Set up monitoring and alerting
- [ ] Prepare incident response plan
- [ ] Budget for ongoing LINK costs
- [ ] Consider implementing access controls
- [ ] Add rate limiting to prevent abuse
- [ ] Set up admin multisig wallet
- [ ] Document operational procedures

## Support Resources

- **Chainlink Docs**: https://docs.chain.link/
- **The Graph Docs**: https://thegraph.com/docs/
- **Hardhat Docs**: https://hardhat.org/
- **Ethers.js Docs**: https://docs.ethers.org/
- **Project README**: See README.md in root

---

**Last Updated**: 2026-01-26
**Version**: 1.0
