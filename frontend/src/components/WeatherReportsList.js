import React from 'react';
import { useQuery, gql } from '@apollo/client';

/**
 * GraphQL query to fetch historical weather reports from the deployed subgraph.
 * Ordered by timestamp descending (most recent first).
 */
const GET_WEATHER_REPORTS = gql`
  query GetWeatherReports {
    weatherReports(orderBy: timestamp, orderDirection: desc, first: 50) {
      id
      city
      temperature
      description
      timestamp
      requester
    }
  }
`;

/**
 * WeatherReportsList — Displays historical weather reports from the subgraph.
 * Uses Apollo Client useQuery with pollInterval for live updates.
 */
function WeatherReportsList({ client }) {
  const { data, loading, error } = useQuery(GET_WEATHER_REPORTS, {
    client,
    pollInterval: 5000, // Poll every 5 seconds for new data
    fetchPolicy: 'network-only',
  });

  if (loading && (!data || !data.weatherReports)) {
    return (
      <div style={{
        padding: '30px',
        textAlign: 'center',
        color: '#8888aa',
      }}>
        <p>⏳ Loading historical data from subgraph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '16px',
        background: 'rgba(233,69,96,0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(233,69,96,0.3)',
      }}>
        <p style={{ color: '#e94560', margin: 0 }}>
          ⚠️ Error loading data from subgraph: {error.message}
        </p>
        <p style={{ color: '#8888aa', fontSize: '0.85rem', marginTop: '8px' }}>
          Make sure the subgraph is deployed and the endpoint is configured correctly.
        </p>
      </div>
    );
  }

  const reports = data?.weatherReports || [];

  if (reports.length === 0) {
    return (
      <div style={{
        padding: '30px',
        textAlign: 'center',
        color: '#8888aa',
        background: 'rgba(26,26,46,0.5)',
        borderRadius: '12px',
        border: '1px dashed #3a3a5c',
      }}>
        <p style={{ fontSize: '1.1rem' }}>📭 No weather reports found yet.</p>
        <p style={{ fontSize: '0.9rem' }}>Submit a weather request above to get started!</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0 4px',
        fontSize: '0.95rem',
      }}>
        <thead>
          <tr>
            {['City', 'Temperature', 'Description', 'Time', 'Requester'].map((header) => (
              <th
                key={header}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: '#e94560',
                  fontWeight: '600',
                  borderBottom: '2px solid #2a2a4a',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr
              key={report.id}
              style={{
                background: index % 2 === 0 ? 'rgba(26,26,46,0.6)' : 'rgba(22,33,62,0.6)',
                transition: 'background 0.2s ease',
              }}
            >
              <td style={{ padding: '12px 16px', color: '#e0e0e0', fontWeight: '500' }}>
                📍 {report.city}
              </td>
              <td style={{
                padding: '12px 16px',
                color: report.temperature < 0 ? '#4fc3f7' : '#ffb74d',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}>
                {(report.temperature / 100).toFixed(2)}°C
              </td>
              <td style={{ padding: '12px 16px', color: '#b0b0cc' }}>
                {report.description}
              </td>
              <td style={{ padding: '12px 16px', color: '#8888aa', fontSize: '0.85rem' }}>
                {new Date(report.timestamp * 1000).toLocaleString()}
              </td>
              <td
                style={{ padding: '12px 16px', color: '#6c63ff', fontFamily: 'monospace', fontSize: '0.85rem' }}
                title={report.requester}
              >
                {report.requester
                  ? `${report.requester.slice(0, 6)}...${report.requester.slice(-4)}`
                  : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WeatherReportsList;