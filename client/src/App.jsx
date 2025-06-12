// App.jsx
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

  // Theme + Language
  useEffect(() => {
    const stored = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', stored);
    setTheme(stored);

    const storedLang = localStorage.getItem('lang');
    if (storedLang) i18n.changeLanguage(storedLang);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  // Location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        alert(t('locationDenied'));
        console.error('Geolocation error:', err);
      }
    );
  }, []);

  // Initial alerts + sockets
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
    socket.on('new-alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      new Audio('/alert.mp3').play().catch(console.error);
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

  // Token
  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (saved) {
      setToken(saved);
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

  // Login / Logout
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

  const handleLogout = () => {
    setAdmin(false);
    setToken('');
    localStorage.removeItem('token');
    alert(t('logoutSuccess'));
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
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setShowInstall(false);
    deferredPrompt.current = null;
  };

  return (
    <div className="app">
      <header className="top-bar">
        <button onClick={toggleTheme}>{theme === 'light' ? '🌙' : '🔆'}</button>
        <div className="lang-buttons">
          <button onClick={() => changeLanguage('en')}>EN</button>
          <button onClick={() => changeLanguage('hi')}>हिंदी</button>
        </div>
      </header>

      <section className="form-section">
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
      </section>

      <section className="admin-panel">
        <h3>{t('adminLogin')}</h3>
        {!admin ? (
          <>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
            <button onClick={handleLogin}>{t('login')}</button>
          </>
        ) : (
          <>
            <button onClick={handleLogout}>{t('logout')}</button>
            <ul className="alert-list">
              {alerts.filter((a) => !a.resolved).map((alert) => (
                <li key={alert._id}>
                  <b>{alert.type}</b>: {alert.description} - {alert.timestamp && new Date(alert.timestamp).toLocaleString()}
                  <button onClick={() => resolveAlert(alert._id)}>{t('resolve')}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="map-section map-container">
        {location.lat && location.lon && (
          <MapContainer center={[location.lat, location.lon]} zoom={13} style={{ height: '400px', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
        )}
      </section>

      <section className="alert-section">
        <h3>📢 {t('liveAlerts')}</h3>
        <ul className="alert-list">
          {alerts.map((a, i) => (
            <li key={i}>
              <b>{a.type}</b>: {a.description}{' '}
              {a.resolved && <span className="resolved">✅ {t('resolved')}</span>}
            </li>
          ))}
        </ul>
      </section>

      {showInstall && (
        <div className="pwa-banner">
          <span>{t('installBanner')}</span>
          <button onClick={handleInstall}>📲 {t('installApp')}</button>
          <button onClick={() => setShowInstall(false)}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;
