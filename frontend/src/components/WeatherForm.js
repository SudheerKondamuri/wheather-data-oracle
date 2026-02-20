import React, { useState } from 'react';

function WeatherForm({ onRequestWeather, loading, walletConnected }) {
  const [city, setCity] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (city.trim()) {
      onRequestWeather(city.trim());
    }
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <h3>Request New Weather Data</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter city (e.g., London)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ padding: '10px', width: '250px', marginRight: '10px' }}
        />
        <button
          type="submit"
          disabled={loading || !walletConnected || !city.trim()}
          style={{
            padding: '10px 20px',
            cursor: loading || !walletConnected || !city.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? "Processing..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}

export default WeatherForm;