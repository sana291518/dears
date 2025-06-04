import { useState, useEffect } from 'react';

function App() {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({ lat: null, lon: null });

  // Get location on load
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        alert("Location access denied. Please allow it for alerts to work.");
      }
    );
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const report = {
      type,
      description,
      location,
      timestamp: new Date().toISOString(),
    };
    console.log('Submitted:', report);
    alert('Incident reported! (Check console)');
    // Later: send to backend here
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h2>🚨 Report an Emergency</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <select value={type} onChange={(e) => setType(e.target.value)} required>
          <option value="">Select Emergency Type</option>
          <option value="fire">🔥 Fire</option>
          <option value="flood">🌊 Flood</option>
          <option value="earthquake">🌍 Earthquake</option>
          <option value="violence">🚔 Violence</option>
          <option value="medical">🩺 Medical</option>
        </select>

        <textarea
          placeholder="Describe the situation..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />

        <button type="submit" style={{ padding: '0.5rem', fontWeight: 'bold' }}>
          Submit Report
        </button>
      </form>

      {location.lat && (
        <p>
          📍 Location: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
        </p>
      )}
    </div>
  );
}

export default App;
