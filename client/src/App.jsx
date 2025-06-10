import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { registerSW } from 'virtual:pwa-register';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL);
console.log('🔍 Loaded API_URL:', API_URL);



delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
});

function App() {
  const { t, i18n } = useTranslation();

  const [theme, setTheme] = useState('light');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [alerts, setAlerts] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initial = stored || system;
    document.documentElement.setAttribute('data-theme', initial);
    setTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => alert(t('locationDenied'))
    );
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/alerts`);

      const data = await res.json();
      setAlerts(data);


    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    socket.on('new-alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      const audio = new Audio('/alert.mp3');
      audio.play().catch(err => console.error('Sound error:', err));
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });

    socket.on('alert-resolved', (updated) => {
      setAlerts((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    });

    return () => {
      socket.off('new-alert');
      socket.off('alert-resolved');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { const response = await fetch(`${API_URL}/api/alerts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type,
    description,
    latitude: location.lat,
    longitude: location.lon,
  }),
});


      if (response.ok) {
        alert(t('reportSuccess'));
        setType('');
        setDescription('');
      } else {
        alert(t('reportFail'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert(t('reportError'));
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('${API_URL}/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        setAdmin(true);
        setToken(data.token);
        alert(t('loginSuccess'));
      } else {
        alert(t('loginFail'));
      }
    } catch (err) {
      console.error(err);
      alert(t('loginError'));
    }
  };

  const resolveAlert = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a._id === data.alert._id ? data.alert : a))
        );
      } else {
        alert(t('resolveFail'));
      }
    } catch (err) {
      console.error(err);
      alert(t('resolveError'));
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <button onClick={toggleTheme} style={{ marginBottom: '1rem' }}>
        {theme === 'light' ? '🌙 Dark Mode' : '🔆 Light Mode'}
      </button>

      <div style={{ marginBottom: '1rem' }}>
        🌐 {t('language')}:
        <button onClick={() => i18n.changeLanguage('en')}>EN</button>
        <button onClick={() => i18n.changeLanguage('hi')}>हिंदी</button>
      </div>

      <h2>{t('reportEmergency')}</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
        <select value={type} onChange={(e) => setType(e.target.value)} required>
          <option value="">{t('selectType')}</option>
          <option value="fire">🔥 {t('fire')}</option>
          <option value="flood">🌊 {t('flood')}</option>
          <option value="earthquake">🌍 {t('earthquake')}</option>
          <option value="violence">🚔 {t('violence')}</option>
          <option value="medical">🩺 {t('medical')}</option>
        </select>

        <textarea
          placeholder={t('describePlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
        />

        <button type="submit" style={{ padding: '0.5rem', fontWeight: 'bold' }}>
          {t('submitReport')}
        </button>
      </form>

      <hr style={{ margin: '2rem 0' }} />

      <h3>{t('adminLogin')}</h3>
      {!admin ? (
        <>
          <input placeholder={t('username')} value={username} onChange={(e) => setUsername(e.target.value)} />
          <input placeholder={t('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>{t('login')}</button>
        </>
      ) : (
        <div>
          <h4>{t('adminDashboard')}</h4>
          <ul>
            {alerts.filter(a => !a.resolved).map((alert) => (
              <li key={alert._id} style={{ marginBottom: '1rem' }}>
                <strong>{alert.type}</strong>: {alert.description} — <em>{new Date(alert.timestamp).toLocaleString()}</em>
                <button style={{ marginLeft: '1rem' }} onClick={() => resolveAlert(alert._id)}>✅ {t('resolve')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <hr style={{ margin: '2rem 0' }} />

      {location.lat && location.lon && (
        <>
          <p>📍 {t('location')}: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}</p>

          <h3>🗺️ {t('alertMap')}</h3>
          <div style={{ height: '400px', marginBottom: '2rem' }}>
            <MapContainer center={[location.lat, location.lon]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <Marker position={[location.lat, location.lon]}>
                <Popup>{t('youAreHere')}</Popup>
              </Marker>

              {alerts.map((alert, index) => (
                <Marker key={index} position={[alert.latitude, alert.longitude]}>
                  <Popup>
                    <strong>{alert.type.toUpperCase()}</strong><br />
                    {alert.description}<br />
                    <small>{new Date(alert.timestamp).toLocaleString()}</small><br />
                    {alert.resolved && (
                      <>
                        ✅ {t('resolved')}<br />
                        <small>{new Date(alert.resolvedAt).toLocaleString()}</small>
                      </>
                    )}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </>
      )}

      <h3>📢 {t('liveAlerts')}</h3>
      <ul>
        {alerts.map((alert, index) => (
          <li key={index}>
            <strong>{alert.type}</strong>: {alert.description} —
            <em> {new Date(alert.timestamp).toLocaleString()}</em>
            {alert.resolved && <span style={{ marginLeft: '0.5rem', color: 'green' }}>✅ {t('resolved')}</span>}
          </li>
        ))}
      </ul>

      {showInstall && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          background: theme === 'dark' ? '#1e1e1e' : '#f8f8f8',
          color: theme === 'dark' ? '#ffffff' : '#000000',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <p style={{ marginBottom: '0.5rem' }}>{t('installBanner')}</p>
          <button
            onClick={async () => {
              const promptEvent = deferredPrompt.current;
              if (!promptEvent) return;
              promptEvent.prompt();
              const result = await promptEvent.userChoice;
              if (result.outcome === 'accepted') {
                console.log('✅ User accepted the install prompt');
              } else {
                console.log('❌ User dismissed the install prompt');
              }
              setShowInstall(false);
              deferredPrompt.current = null;
            }}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 'bold',
              backgroundColor: theme === 'dark' ? '#d9534f' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#d9534f',
              border: '1px solid',
              borderColor: theme === 'dark' ? '#ffffff' : '#d9534f',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {t('installApp')}
          </button>
        </div>
      )}
    </div>
  );
}

registerSW({ immediate: true });

export default App;
