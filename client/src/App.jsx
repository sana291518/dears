import 'leaflet/dist/leaflet.css';
import './App.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { FaSun, FaMoon } from 'react-icons/fa';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const [alerts, setAlerts] = useState([]);
  const [formData, setFormData] = useState({ type: '', description: '', latitude: '', longitude: '' });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isAdmin, setIsAdmin] = useState(false);
  const { t, i18n } = useTranslation();
  const deferredPrompt = useRef(null);

  // Preload alert.mp3 to cache for offline
  useEffect(() => {
    const audio = new Audio('/alert.mp3');
    audio.load();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/alerts`);
      const data = await res.json();
      setAlerts(data.reverse());
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    socket.on('new-alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);

      // Play sound
      const audio = new Audio('/alert.mp3');
      audio.play().catch((err) => console.warn('Audio playback failed:', err));

      // Trigger vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
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
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setFormData({ type: '', description: '', latitude: '', longitude: '' });
    }
  };

  const handleResolve = async (id) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/alerts/${id}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) alert('Resolve failed');
  };

  const handleLogin = async () => {
    const password = prompt('Enter admin password');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      setIsAdmin(true);
    } else {
      alert('Login failed');
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const isValidCoords = (lat, lon) =>
    typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);

  const handleInstallPrompt = (e) => {
    e.preventDefault();
    deferredPrompt.current = e;
  };

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      deferredPrompt.current.userChoice.then(() => {
        deferredPrompt.current = null;
      });
    }
  };

  const handleLangChange = (e) => {
    i18n.changeLanguage(e.target.value);
    localStorage.setItem('lang', e.target.value);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') || 'en';
    i18n.changeLanguage(savedLang);
  }, []);

  return (
    <div className={`app ${theme}`}>
      <header>
        <h1>{t('title')}</h1>
        <select onChange={handleLangChange} value={i18n.language}>
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
        </select>
        <button onClick={toggleTheme}>{theme === 'dark' ? <FaSun /> : <FaMoon />}</button>
        {!isAdmin && <button onClick={handleLogin}>{t('adminLogin')}</button>}
        {deferredPrompt.current && <button onClick={handleInstallClick}>{t('installApp')}</button>}
      </header>

      <form onSubmit={handleSubmit}>
        <input
          placeholder={t('type')}
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          required
        />
        <input
          placeholder={t('description')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
        <input
          placeholder={t('latitude')}
          value={formData.latitude}
          onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
          type="number"
          required
        />
        <input
          placeholder={t('longitude')}
          value={formData.longitude}
          onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
          type="number"
          required
        />
        <button type="submit">{t('submit')}</button>
      </form>

      <MapContainer center={[28.61, 77.23]} zoom={5} style={{ height: '400px' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {alerts.filter(a => isValidCoords(a.latitude, a.longitude)).map((alert, idx) => (
          <Marker key={idx} position={[alert.latitude, alert.longitude]}>
            <Popup>
              <strong>{alert.type.toUpperCase()}</strong>
              <br />
              {alert.description}
              <br />
              <small>
                {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '—'}
              </small>
              <br />
              {alert.resolved && (
                <>
                  ✅ {t('resolved')}
                  <br />
                  <small>
                    {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : ''}
                  </small>
                </>
              )}
              {isAdmin && !alert.resolved && (
                <button onClick={() => handleResolve(alert._id)}>{t('resolve')}</button>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <footer>
        <p>{t('footer')}</p>
      </footer>
    </div>
  );
}

export default App;
