// [SAME IMPORTS AS BEFORE]
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL);
console.log('🔍 Loaded API_URL:', API_URL);

// Fix Leaflet icons
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

  // Theme
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

  // Language
  useEffect(() => {
    const storedLang = localStorage.getItem('lang');
    if (storedLang) i18n.changeLanguage(storedLang);
  }, []);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  // Location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        alert(t('locationDenied'));
        console.error('Geolocation error:', err);
      }
    );
  }, []);

  // Alerts
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

  // Sockets
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

  // Admin Token
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setAdmin(true);
    }
  }, []);

  // Submit Alert
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

  // Admin Login
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
        localStorage.setItem('token', data.token);
        alert(t('loginSuccess'));
      } else {
        alert(t('loginFail'));
      }
    } catch (err) {
      console.error(err);
      alert(t('loginError'));
    }
  };

  // Resolve Alert
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

  // PWA Banner
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) return;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('PWA installed');
    }
    setShowInstall(false);
    deferredPrompt.current = null;
  };

  const handleCloseInstall = () => {
    setShowInstall(false);
    deferredPrompt.current = null;
  };

  // -------------------- UI --------------------
  return (
    <div style={{ padding: '2rem' }}>
      {/* Language and Theme */}
      <button onClick={toggleTheme}>{theme === 'light' ? '🌙 Dark' : '🔆 Light'}</button>
      <div>
        {t('language')}:
        <button onClick={() => changeLanguage('en')}>EN</button>
        <button onClick={() => changeLanguage('hi')}>हिंदी</button>
      </div>

      {/* Form */}
      <h2>{t('reportEmergency')}</h2>
      <form onSubmit={handleSubmit}>
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
        <button type="submit">{t('submitReport')}</button>
      </form>

      {/* Admin */}
      <h3>{t('adminLogin')}</h3>
      {!admin ? (
        <>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          <button onClick={handleLogin}>{t('login')}</button>
        </>
      ) : (
        <ul>
          {alerts.filter((a) => !a.resolved).map((alert) => (
            <li key={alert._id}>
              {alert.type} - {alert.description} -{' '}
              {alert.timestamp && new Date(alert.timestamp).toLocaleString()}
              <button onClick={() => resolveAlert(alert._id)}>{t('resolve')}</button>
            </li>
          ))}
        </ul>
      )}

      {/* Map */}
      {location.lat !== null && location.lon !== null && (
        <>
          <h3>🗺️ {t('alertMap')}</h3>
          <MapContainer
            center={[location.lat, location.lon]}
            zoom={13}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[location.lat, location.lon]}>
              <Popup>{t('youAreHere')}</Popup>
            </Marker>
            {alerts.map((a, i) => (
              a.latitude && a.longitude && (
                <Marker key={i} position={[a.latitude, a.longitude]}>
                  <Popup>
                    {a.type} - {a.description}
                    <br />
                    {a.timestamp && new Date(a.timestamp).toLocaleString()}
                    {a.resolved && <div>✅ {t('resolved')}</div>}
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </>
      )}

      {/* Live Alerts */}
      <h3>📢 {t('liveAlerts')}</h3>
      <ul>
        {alerts.map((a, i) => (
          <li key={i}>
            <strong>{a.type}</strong>: {a.description}{' '}
            {a.resolved && <span style={{ color: 'green' }}>✅ {t('resolved')}</span>}
          </li>
        ))}
      </ul>

      {/* PWA Banner */}
      {showInstall && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '1rem', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
          <span>{t('installBanner')}</span>
          <button onClick={handleInstall}>📲 {t('installApp')}</button>
          <button onClick={handleCloseInstall}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;