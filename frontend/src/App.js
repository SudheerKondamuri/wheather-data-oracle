import React, { useState } from 'react';
import { ethers } from 'ethers';
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client';

const CONTRACT_ADDRESS = "0x...";
const ABI = [...]; // Your Contract ABI

const client = new ApolloClient({
  uri: 'YOUR_GRAPH_ENDPOINT',
  cache: new InMemoryCache(),
});

const GET_REPORTS = gql`
  query {
    weatherReports(orderBy: timestamp, orderDirection: desc) {
      id city temperature description timestamp
    }
  }
`;

function App() {
  const [city, setCity] = useState("");
  const { data, loading: queryLoading } = useQuery(GET_REPORTS, { client, pollInterval: 5000 });

  async function requestWeather() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    
    const tx = await contract.requestWeather(city);
    await tx.wait();
    alert("Request Transaction Confirmed!");
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Decentralized Weather Oracle</h1>
      <input 
        type="text" 
        placeholder="City Name" 
        onChange={(e) => setCity(e.target.value)} 
      />
      <button onClick={requestWeather}>Request Weather Update</button>

      <hr />
      <h2>Historical Weather Data (Subgraph)</h2>
      {queryLoading ? <p>Loading reports...</p> : (
        <table>
          <thead>
            <tr><th>City</th><th>Temp</th><th>Time</th></tr>
          </thead>
          <tbody>
            {data?.weatherReports.map(r => (
              <tr key={r.id}>
                <td>{r.city}</td>
                <td>{r.temperature / 100}°C</td>
                <td>{new Date(r.timestamp * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;