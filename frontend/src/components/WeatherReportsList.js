import React from 'react';

function WeatherReportsList({ reports, loading, error }) {
  if (loading) {
    return <p>Loading historical data...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error loading data from subgraph: {error.message}</p>;
  }

  if (!reports || reports.length === 0) {
    return <p>No weather reports found yet. Submit a request to get started!</p>;
  }

  return (
    <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ background: '#eee' }}>
          <th>City</th>
          <th>Temperature</th>
          <th>Description</th>
          <th>Timestamp</th>
          <th>Requester</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr key={report.id}>
            <td>{report.city}</td>
            <td>{(report.temperature / 100).toFixed(2)}°C</td>
            <td>{report.description}</td>
            <td>{new Date(report.timestamp * 1000).toLocaleString()}</td>
            <td title={report.requester}>
              {report.requester
                ? `${report.requester.slice(0, 6)}...${report.requester.slice(-4)}`
                : "N/A"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default WeatherReportsList;