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

// fix default Leaflet marker paths
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

  /* -------------------- Theme -------------------- */
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

  /* -------------------- Geolocation -------------------- */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => alert(t('locationDenied'))
    );
  }, []);

  /* -------------------- Fetch Alerts -------------------- */
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/alerts`);
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  /* -------------------- Socket.IO -------------------- */
  useEffect(() => {
    socket.on('new-alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      const audio = new Audio('/alert.mp3');
      audio.play().catch(console.error);
      navigator.vibrate?.([200, 100, 200]);
    });

    socket.on('alert-resolved', (updated) => {
      setAlerts((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    });

    return () => {
      socket.off('new-alert');
      socket.off('alert-resolved');
    };
  }, []);

  /* -------------------- Submit Report -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          latitude: location.lat,
          longitude: location.lon,
        }),
      });
      if (res.ok) {
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

  /* -------------------- Admin Login -------------------- */
  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
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

  /* -------------------- Resolve Alert -------------------- */
  const resolveAlert = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a._id === data.alert._id ? data.alert : a)));
      } else {
        alert(t('resolveFail'));
      }
    } catch (err) {
      console.error(err);
      alert(t('resolveError'));
    }
  };

  /* -------------------- PWA Install Banner -------------------- */
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    handleCloseInstall();
  };

  const handleCloseInstall = () => {
    setShowInstall(false);
    deferredPrompt.current = null;
  };

  /* -------------------- UI -------------------- */
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{ marginBottom: '1rem' }}>
        {theme === 'light' ? '🌙 Dark Mode' : '🔆 Light Mode'}
      </button>

      {/* Language selector */}
      <div style={{ marginBottom: '1rem' }}>
        🌐 {t('language')}:
        <button onClick={() => i18n.changeLanguage('en')}>EN</button>
        <button onClick={() => i18n.changeLanguage('hi')}>हिंदी</button>
      </div>

      {/* Report form */}
      <h2>{t('reportEmergency')}</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}
      >
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

      {/* Admin login / dashboard */}
      <h3>{t('adminLogin')}</h3>
      {!admin ? (
        <>
          <input
            placeholder={t('username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>{t('login')}</button>
        </>
      ) : (
        <div>
          <h4>{t('adminDashboard')}</h4>
          <ul>
            {alerts
              .filter((a) => !a.resolved)
              .map((alert) => (
                <li key={alert._id} style={{ marginBottom: '1rem' }}>
                  <strong>{alert.type}</strong>: {alert.description} —{' '}
                  <em>{new Date(alert.timestamp).toLocaleString()}</em>
                  <button
                    style={{ marginLeft: '1rem' }}
                    onClick={() => resolveAlert(alert._id)}
                  >
                    ✅ {t('resolve')}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <hr style={{ margin: '2rem 0' }} />

      {/* Map */}
      {location.lat && location.lon && (
        <>
          <p>
            📍 {t('location')}: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
          </p>

          <h3>🗺️ {t('alertMap')}</h3>
          <div style={{ height: '400px', marginBottom: '2rem' }}>
            <MapContainer
              center={[location.lat, location.lon]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <Marker position={[location.lat, location.lon]}>
                <Popup>{t('youAreHere')}</Popup>
              </Marker>

              {alerts.map((alert, idx) => (
                <Marker key={idx} position={[alert.latitude, alert.longitude]}>
                  <Popup>
                    <strong>{alert.type.toUpperCase()}</strong>
                    <br />
                    {alert.description}
                    <br />
                    <small>{new Date(alert.timestamp).toLocaleString()}</small>
                    <br />
                    {alert.resolved && (
                      <>
                        ✅ {t('resolved')}
                        <br />
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

      {/* Live alerts list */}
      <h3>📢 {t('liveAlerts')}</h3>
      <ul>
        {alerts.map((alert, idx) => (
          <li key={idx}>
            <strong>{alert.type}</strong>: {alert.description} —{' '}
            <em>{new Date(alert.timestamp).toLocaleString()}</em>
            {alert.resolved && (
              <span style={{ marginLeft: '0.5rem', color: 'green' }}>
                ✅ {t('resolved')}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Install banner (snackbar style) */}
      {showInstall && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '360px',
            width: 'calc(100% - 2rem)',
            background: theme === 'dark' ? '#242424' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#242424',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 1000,
          }}
        >
          <span style={{ flex: 1 }}>{t('installBanner')}</span>

          <button
            onClick={handleInstall}
            style={{
              padding: '0.4rem 0.8rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '6px',
              background: '#d9534f',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {t('installApp')}
          </button>

          <button
            onClick={handleCloseInstall}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              lineHeight: 1,
              cursor: 'pointer',
              color: 'inherit',
            }}
            aria-label="close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

registerSW({ immediate: true });
export default App;
