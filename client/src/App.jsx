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

// Fix default Leaflet marker paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
});

function App() {
  const { t, i18n } = useTranslation();

  // UI state
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [showInstall, setShowInstall] = useState(false);
  const deferredPrompt = useRef(null);

  // Geolocation & data
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [alerts, setAlerts] = useState([]);

  // Admin/login state
  const [admin, setAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  // Report form
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');

  // 1️⃣ Initialize theme & language from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', storedTheme);
    setTheme(storedTheme);

    const storedLang = localStorage.getItem('lang') || 'en';
    i18n.changeLanguage(storedLang);
    setLanguage(storedLang);
  }, [i18n]);

  // Persist theme & language
  useEffect(() => localStorage.setItem('theme', theme), [theme]);
  useEffect(() => localStorage.setItem('lang', language), [language]);

  // 2️⃣ Restore admin/token on mount
  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (saved) {
      setToken(saved);
      setAdmin(true);
    }
  }, []);

  // 3️⃣ Get geolocation once
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => alert(t('locationDenied'))
    );
  }, [t]);

  // 4️⃣ Fetch existing alerts on mount
  useEffect(() => {
    fetch(`${API_URL}/api/alerts`)
      .then((res) => res.json())
      .then(setAlerts)
      .catch(console.error);
  }, []);

  // 5️⃣ Socket.IO for real-time alerts
  useEffect(() => {
    socket.on('new-alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      new Audio('/alert.mp3').play().catch(() => {});
      navigator.vibrate?.([200, 100, 200]);
    });
    return () => socket.off('new-alert');
  }, []);

  // 6️⃣ PWA install prompt handling
  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const handleInstall = () => {
    deferredPrompt.current?.prompt();
    deferredPrompt.current?.userChoice.then(() => {
      deferredPrompt.current = null;
      setShowInstall(false);
    });
  };

  // 7️⃣ Admin login
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
    } catch {
      alert(t('loginError'));
    }
  };

  // 8️⃣ Report submission
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
    } catch {
      alert(t('reportError'));
    }
  };

  // 9️⃣ Resolve an alert
  const resolveAlert = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { alert: updated } = await res.json();
        setAlerts((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      } else {
        alert(t('resolveFail'));
      }
    } catch {
      alert(t('resolveError'));
    }
  };

  // --- RENDER ---

  // Fallback until geolocation is ready
  if (location.lat === null || location.lon === null) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
        {t('waitingForLocation')}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      {/* Theme & Language */}
      <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
        {theme === 'light' ? '🌙 Dark Mode' : '🔆 Light Mode'}
      </button>
      <button onClick={() => { i18n.changeLanguage('en'); setLanguage('en'); }}>EN</button>
      <button onClick={() => { i18n.changeLanguage('hi'); setLanguage('hi'); }}>HI</button>

      {/* Install Banner */}
      {showInstall && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: theme === 'dark' ? '#333' : '#fff',
            padding: '1rem',
            borderRadius: 8,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          <span>{t('installBanner')}</span>
          <button onClick={handleInstall} style={{ marginLeft: 12 }}>
            {t('installApp')}
          </button>
        </div>
      )}

      {/* Report Form */}
      <h2>{t('reportEmergency')}</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder={t('describePlaceholder')}
          required
        />
        <button type="submit">{t('submitReport')}</button>
      </form>

      <hr style={{ margin: '2rem 0' }} />

      {/* Admin Login / Dashboard */}
      <h3>{t('adminLogin')}</h3>
      {!admin ? (
        <>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('username')}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('password')}
          />
          <button onClick={handleLogin}>{t('login')}</button>
        </>
      ) : (
        <ul>
          {alerts
            .filter((a) => !a.resolved)
            .map((a) => (
              <li key={a._id}>
                <strong>{a.type}</strong>: {a.description}{' '}
                <button onClick={() => resolveAlert(a._id)}>✅ {t('resolve')}</button>
              </li>
            ))}
        </ul>
      )}

      <hr style={{ margin: '2rem 0' }} />

      {/* Map */}
      <p>
        📍 {t('location')}: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
      </p>
      <MapContainer
        center={[location.lat, location.lon]}
        zoom={13}
        style={{ height: 400, width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[location.lat, location.lon]}>
          <Popup>{t('youAreHere')}</Popup>
        </Marker>
        {alerts.map((a, i) => (
          <Marker key={i} position={[a.latitude, a.longitude]}>
            <Popup>
              <strong>{a.type}</strong>: {a.description}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
