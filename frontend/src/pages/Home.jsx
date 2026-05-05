import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import api from '../utils/api';
import NavBar from '../components/NavBar';

const SPORTS = [
  { name: 'Badminton', emoji: '🏸', players: '2-4' },
  { name: 'Pickleball', emoji: '🥒', players: '2-4' },
  { name: 'Basketball', emoji: '🏀', players: '5-10' },
  { name: 'Football', emoji: '⚽', players: '10-22' },
  { name: 'Tennis', emoji: '🎾', players: '2-4' },
  { name: 'Cricket', emoji: '🏏', players: '11-22' },
  { name: 'Table Tennis', emoji: '🏓', players: '2-4' },
  { name: 'Volleyball', emoji: '🏐', players: '6-12' },
];

export default function Home() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const hasPrompted = sessionStorage.getItem('sm_location_prompted');
    const needsUpdate = !user?.location?.address ||
                       user.location.address === 'Shankar Nagar, Nagpur' ||
                       user.location.address === 'Current location' ||
                       user.location.lat === 21.1458; // Default Nagpur lat

    if (!hasPrompted && needsUpdate && navigator.geolocation) {
      sessionStorage.setItem('sm_location_prompted', 'true');

      // Auto-prompt for location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const res = await api.put('/users/me', {
              address: '📍 Current location',
              lat: latitude,
              lng: longitude
            });
            updateUser({ ...res.data });
          } catch (err) {
            console.error('Failed to update location:', err);
          }
        },
        (error) => {
          console.log('Location auto-update skipped:', error.message);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  }, [user?.location?.address, user?.location?.lat, updateUser]);

  const selectSport = (sport) => {
    navigate('/select-players', { state: { sport } });
  };
  return (
    <div className="app-shell">
      <div style={{ background: 'var(--green)', color: '#fff', padding: '20px 16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, opacity: 0.8 }}>{greeting},</p>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{firstName} 👋</h1>
          </div>
          <div
            onClick={() => navigate('/profile')}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 800, color: '#fff',
              cursor: 'pointer'
            }}
          >{initials}</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 12,
          padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center'
        }}>
          <span>📍</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.location?.address || 'Location not set'}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.2)', padding: '2px 8px',
            borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap'
          }}>
            {user?.skillLevel}
          </span>
        </div>
      </div>

      <div className="scroll-content">
        <div style={{ background: 'var(--amber-light)', borderRadius: 14, padding: '12px 14px', marginBottom: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#633806' }}>Quick play</p>
            <p style={{ fontSize: 12, color: '#85500b' }}>Tap a sport to find players right now</p>
          </div>
        </div>

        <div className="section-label" style={{ marginTop: 20 }}>Pick a sport</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SPORTS.map(sport => (
            <div
              key={sport.name}
              onClick={() => selectSport(sport.name)}
              style={{
                background: 'var(--bg2)', borderRadius: 16, padding: '16px 14px',
                cursor: 'pointer', border: '2px solid transparent', transition: '0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ fontSize: 30 }}>{sport.emoji}</div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, marginTop: 8 }}>{sport.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{sport.players} players</div>
            </div>
          ))}
        </div>

        <div className="section-label">My sports</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(user?.sports || []).length > 0
            ? user.sports.map(s => <span key={s} className="chip chip-green" style={{ fontSize: 13, padding: '5px 12px' }}>{s}</span>)
            : <p style={{ fontSize: 13, color: 'var(--text2)' }}>No sports added yet — edit profile to add</p>
          }
        </div>
      </div>

      <NavBar />
    </div>
  );
}
