import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const tabs = [
  { path: '/', icon: '⌂', label: 'Home' },
  { path: '/matches', icon: '◉', label: 'Matches' },
  { path: '/notifications', icon: '🔔', label: 'Alerts' },
  { path: '/profile', icon: '◎', label: 'Profile' },
];

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const refresh = () => fetchUnreadCount();
    const countUpdate = (event) => setUnreadCount(event.detail?.count || 0);
    window.addEventListener('sportmate:notifications-refresh', refresh);
    window.addEventListener('sportmate:notification-new', refresh);
    window.addEventListener('sportmate:notifications-count', countUpdate);

    return () => {
      window.removeEventListener('sportmate:notifications-refresh', refresh);
      window.removeEventListener('sportmate:notification-new', refresh);
      window.removeEventListener('sportmate:notifications-count', countUpdate);
    };
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  return (
    <div className="nav-bar">
      {tabs.map(tab => (
        <div
          key={tab.path}
          className={`nav-item ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
          style={{ position: 'relative' }}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.path === '/notifications' && unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 7,
              left: '50%',
              marginLeft: 6,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 10,
              background: '#E24B4A',
              color: '#fff',
              border: '1.5px solid var(--bg)',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {tab.label}
        </div>
      ))}
    </div>
  );
}
