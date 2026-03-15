import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import WeatherForm from './components/WeatherForm';
import WeatherReportsList from './components/WeatherReportsList';

// Environment-based configuration (never hardcode sensitive values)
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";
const SUBGRAPH_URI = process.env.REACT_APP_SUBGRAPH_URI || "http://localhost:8000/subgraphs/name/weather-oracle";

// Full contract ABI for WeatherOracle interaction
const WEATHER_ORACLE_ABI = [
  "function requestWeather(string _city) public payable returns (bytes32)",
  "function weatherReports(bytes32) public view returns (string city, int256 temperature, string description, uint256 timestamp)",
  "function getFee() public view returns (uint256)",
  "function getOracle() public view returns (address)",
  "event WeatherRequested(bytes32 indexed requestId, string city, address indexed requester)",
  "event WeatherReported(bytes32 indexed requestId, string city, int256 temperature, string description, uint256 timestamp, address indexed requester)",
];

// Initialize Apollo Client for subgraph queries
const apolloClient = new ApolloClient({
  uri: SUBGRAPH_URI,
  cache: new InMemoryCache(),
});

function App() {
  const [wallet, setWallet] = useState({ address: "", balance: "", network: "" });
  const [contract, setContract] = useState(null);

  // Update wallet info: address, balance, network
  const updateWalletInfo = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        const address = accounts[0].address;
        const balance = await provider.getBalance(address);
        const network = await provider.getNetwork();

        setWallet({
          address,
          balance: ethers.formatEther(balance),
          network: network.name === 'unknown' ? `Chain ID: ${network.chainId}` : network.name,
        });

        // Initialize contract instance with signer
        if (CONTRACT_ADDRESS) {
          const signer = await provider.getSigner();
          setContract(new ethers.Contract(CONTRACT_ADDRESS, WEATHER_ORACLE_ABI, signer));
        }
      }
    } catch (error) {
      console.error("Error updating wallet info:", error);
    }
  }, []);

  // Listen for wallet/network changes
  useEffect(() => {
    if (!window.ethereum) return;

    updateWalletInfo();
    window.ethereum.on('accountsChanged', updateWalletInfo);
    window.ethereum.on('chainChanged', () => window.location.reload());

    return () => {
      window.ethereum.removeListener('accountsChanged', updateWalletInfo);
    };
  }, [updateWalletInfo]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this DApp!");
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      updateWalletInfo();
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  return (
    <ApolloProvider client={apolloClient}>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #0f0f23 50%, #1a1a2e 100%)',
        color: '#e0e0e0',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>

          {/* Header */}
          <header style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{
              fontSize: '2.2rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #e94560, #6c63ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
            }}>
              ⛅ Decentralized Weather Oracle
            </h1>
            <p style={{ color: '#8888aa', fontSize: '1rem', margin: 0 }}>
              Powered by Chainlink Any API • Indexed by The Graph Protocol
            </p>
          </header>

          {/* Wallet Dashboard */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '20px 25px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #2a2a4a',
          }}>
            <h3 style={{ color: '#6c63ff', marginTop: 0, fontSize: '1rem' }}>
              🔗 Wallet Dashboard
            </h3>
            {wallet.address ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <span style={{ color: '#8888aa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Account</span>
                  <p style={{ margin: '4px 0', fontFamily: 'monospace', fontSize: '0.9rem', color: '#e0e0e0' }}>
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#8888aa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Network</span>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#00d9a3' }}>
                    {wallet.network.toUpperCase()}
                  </p>
                </div>
                <div>
                  <span style={{ color: '#8888aa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Balance</span>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#ffb74d', fontFamily: 'monospace' }}>
                    {parseFloat(wallet.balance).toFixed(4)} ETH
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                style={{
                  padding: '12px 28px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6c63ff, #4a45b2)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Weather Request Form */}
          <WeatherForm
            contract={contract}
            account={wallet.address}
            onRequestComplete={updateWalletInfo}
          />

          {/* Historical Weather Reports */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '25px',
            borderRadius: '12px',
            border: '1px solid #2a2a4a',
          }}>
            <h3 style={{ color: '#6c63ff', marginTop: 0, fontSize: '1.2rem' }}>
              📊 Historical Weather Reports
            </h3>
            <WeatherReportsList client={apolloClient} />
          </div>

          {/* Footer */}
          <footer style={{
            marginTop: '40px',
            textAlign: 'center',
            color: '#4a4a6a',
            fontSize: '0.8rem',
          }}>
            <p>Contract: {CONTRACT_ADDRESS ? `${CONTRACT_ADDRESS.slice(0, 10)}...` : "Not configured"}</p>
            <p>Subgraph: {SUBGRAPH_URI ? "Connected" : "Not configured"}</p>
          </footer>
        </div>
      </div>
    </ApolloProvider>
  );
}

export default App;