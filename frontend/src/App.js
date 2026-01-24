import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client';
import ABI from './WeatherOracleABI.json';

const CONTRACT_ADDRESS = "0x...";
const SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/...";

const client = new ApolloClient({
  uri: SUBGRAPH_URL,
  cache: new InMemoryCache(),
});

const GET_WEATHER_REPORTS = gql`
  query GetReports {
    weatherReports(orderBy: timestamp, orderDirection: desc) {
      id
      city
      temperature
      description
      timestamp
    }
  }
`;

function App() {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const { data } = useQuery(GET_WEATHER_REPORTS, { client, pollInterval: 5000 });

  async function handleRequest() {
    if (!window.ethereum) return alert("Install Metamask");
    setLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.requestWeather(city);
      await tx.wait();
      alert("Request Sent to Chainlink!");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Weather Oracle Dashboard</h1>
      <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter City" />
      <button onClick={handleRequest} disabled={loading}>
        {loading ? "Processing..." : "Request Weather"}
      </button>

      <h2>Historical Reports (from Subgraph)</h2>
      <ul>
        {data?.weatherReports.map(report => (
          <li key={report.id}>
            {report.city}: {report.temperature}°C - {report.description} 
            ({new Date(report.timestamp * 1000).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;