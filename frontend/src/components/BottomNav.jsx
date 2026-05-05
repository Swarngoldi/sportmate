import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/matches', icon: '👥', label: 'Matches' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="nav-bar">
      {tabs.map(tab => (
        <div
          key={tab.path}
          className={`nav-item ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.label}
        </div>
      ))}
    </nav>
  );
}
