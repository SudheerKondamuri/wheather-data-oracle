import React, { useState } from 'react';

/**
 * WeatherForm — Component for requesting weather data from the oracle.
 * Handles contract interaction, displays transaction status and feedback.
 */
function WeatherForm({ contract, account, onRequestComplete }) {
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCity = city.trim();

    if (!trimmedCity) {
      setStatus("Please enter a city name.");
      return;
    }

    if (!contract) {
      setStatus("Contract not connected. Please connect your wallet first.");
      return;
    }

    setLoading(true);
    setStatus("Initiating transaction...");

    try {
      const tx = await contract.requestWeather(trimmedCity);
      setStatus(`Transaction pending (${tx.hash.slice(0, 10)}...). Awaiting confirmation...`);

      const receipt = await tx.wait();
      setStatus(`✅ Weather request for "${trimmedCity}" submitted successfully! (Block: ${receipt.blockNumber})`);
      setCity("");

      // Notify parent to refresh data
      if (onRequestComplete) onRequestComplete();
    } catch (error) {
      console.error("Transaction error:", error);
      const message = error.reason || error.message || "Transaction failed.";
      setStatus(`❌ Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '25px',
      borderRadius: '12px',
      marginBottom: '30px',
      border: '1px solid #2a2a4a'
    }}>
      <h3 style={{ color: '#e94560', marginTop: 0, fontSize: '1.2rem' }}>
        🌤️ Request New Weather Data
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Enter city (e.g., London)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={!account || loading}
          style={{
            padding: '12px 16px',
            flex: '1',
            minWidth: '200px',
            borderRadius: '8px',
            border: '1px solid #3a3a5c',
            background: '#0f0f23',
            color: '#e0e0e0',
            fontSize: '1rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !account || !city.trim()}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: loading || !account || !city.trim()
              ? '#3a3a5c'
              : 'linear-gradient(135deg, #e94560, #c23152)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: loading || !account || !city.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          {loading ? "⏳ Processing..." : "Submit Request"}
        </button>
      </form>
      {status && (
        <p style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: status.includes("❌") ? 'rgba(233,69,96,0.15)' : 'rgba(0,217,163,0.1)',
          color: status.includes("❌") ? '#e94560' : '#00d9a3',
          fontSize: '0.9rem',
          wordBreak: 'break-word',
        }}>
          {status}
        </p>
      )}
    </div>
  );
}

export default WeatherForm;