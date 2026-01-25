import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client';

// These should be moved to a .env file for production
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0xYourDeployedContractAddress";
const SUBGRAPH_URI = process.env.REACT_APP_SUBGRAPH_URI || "YOUR_SUBGRAPH_GRAPHQL_ENDPOINT";

// Initialize Apollo Client to fetch indexed data from the Subgraph
const client = new ApolloClient({
  uri: SUBGRAPH_URI,
  cache: new InMemoryCache(),
});

// GraphQL Query to fetch historical reports
const GET_WEATHER_REPORTS = gql`
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
`;

function App() {
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [wallet, setWallet] = useState({ address: "", balance: "", network: "" });
  const [loading, setLoading] = useState(false);

  // Requirement: Display connected account's balance and network
  const updateWalletInfo = useCallback(async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const address = accounts[0];
          const balance = await provider.getBalance(address);
          const network = await provider.getNetwork();

          setWallet({
            address: address,
            balance: ethers.utils.formatEther(balance),
            network: network.name === 'unknown' ? `Chain ID: ${network.chainId}` : network.name
          });
        }
      } catch (error) {
        console.error("Error updating wallet info:", error);
      }
    }
  }, []);

  // Listen for account or network changes
  useEffect(() => {
    if (window.ethereum) {
      updateWalletInfo();
      window.ethereum.on('accountsChanged', updateWalletInfo);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, [updateWalletInfo]);

  // Requirement: Display list of historical reports from Subgraph
  const { data, loading: queryLoading, error: queryError } = useQuery(GET_WEATHER_REPORTS, {
    client,
    pollInterval: 5000, // Dynamically update as new data becomes available
  });

  // Requirement: Handle requestWeather transaction and provide feedback
  const handleRequestWeather = async () => {
    if (!city) return setStatus("Please enter a city name.");
    if (!window.ethereum) return setStatus("Please install MetaMask.");

    setLoading(true);
    setStatus("Initiating transaction...");

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // ABI should be imported from your compiled artifacts
      const abi = ["function requestWeather(string _city) public returns (bytes32)"];
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

      const tx = await contract.requestWeather(city);
      setStatus("Transaction pending... awaiting confirmation.");
      
      await tx.wait();
      setStatus(`Success! Weather request for ${city} submitted.`);
      setCity("");
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.reason || error.message || "Transaction failed"}`);
    } finally {
      setLoading(false);
      updateWalletInfo();
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto', fontFamily: 'Arial' }}>
      <h1>Decentralized Weather Oracle</h1>

      {/* Wallet Information Section */}
      <div style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Wallet Dashboard</h3>
        {wallet.address ? (
          <>
            <p><strong>Account:</strong> {wallet.address}</p>
            <p><strong>Network:</strong> {wallet.network.toUpperCase()}</p>
            <p><strong>Balance:</strong> {parseFloat(wallet.balance).toFixed(4)} ETH</p>
          </>
        ) : (
          <button onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>Connect Wallet</button>
        )}
      </div>

      {/* Oracle Request Form */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Request New Weather Data</h3>
        <input 
          type="text" 
          placeholder="Enter city (e.g., London)" 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ padding: '10px', width: '250px', marginRight: '10px' }}
        />
        <button onClick={handleRequestWeather} disabled={loading || !wallet.address}>
          {loading ? "Processing..." : "Submit Request"}
        </button>
        <p style={{ color: status.includes("Error") ? "red" : "blue" }}>{status}</p>
      </div>

      <hr />

      {/* Historical Data Table from Subgraph */}
      <h3>Historical Weather Reports</h3>
      {queryLoading && <p>Loading historical data...</p>}
      {queryError && <p>Error loading data from subgraph.</p>}
      
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th>City</th>
            <th>Temperature</th>
            <th>Description</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {data && data.weatherReports.map((report) => (
            <tr key={report.id}>
              <td>{report.city}</td>
              <td>{(report.temperature / 100).toFixed(2)}°C</td>
              <td>{report.description}</td>
              <td>{new Date(report.timestamp * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;