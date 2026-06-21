import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import NavBar from '../components/NavBar';
import LocationSearch from '../components/LocationSearch';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState({
    address: user?.location?.address || '',
    lat: user?.location?.lat || 0,
    lng: user?.location?.lng || 0
  });
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const firstName = user?.name?.split(' ')[0] || 'there';
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    setLocationDraft({
      address: user?.location?.address || '',
      lat: user?.location?.lat || 0,
      lng: user?.location?.lng || 0
    });
  }, [user?.location?.address, user?.location?.lat, user?.location?.lng]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.count || 0);
      } catch {
        setUnreadCount(0);
      }
    };

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

  const selectSport = (sport) => {
    navigate('/select-players', { state: { sport } });
  };

  const openLocationEditor = () => {
    setLocationDraft({
      address: user?.location?.address || '',
      lat: user?.location?.lat || 0,
      lng: user?.location?.lng || 0
    });
    setLocationError('');
    setEditingLocation(true);
  };

  const saveLocation = async () => {
    if (!locationDraft.address) {
      setLocationError('Please choose a location');
      return;
    }

    setSavingLocation(true);
    setLocationError('');

    try {
      const res = await api.put('/users/me', {
        address: locationDraft.address,
        lat: locationDraft.lat,
        lng: locationDraft.lng
      });
      updateUser({ ...res.data });
      setEditingLocation(false);
    } catch (err) {
      setLocationError(err.response?.data?.message || 'Could not update location');
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="app-shell">
      <div style={{ background: 'var(--green)', color: '#fff', padding: '20px 16px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, opacity: 0.8 }}>{greeting},</p>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{firstName} 👋</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label="Open notifications"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 10,
                  background: '#E24B4A',
                  color: '#fff',
                  border: '2px solid var(--green)',
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
            </button>
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
        </div>

        <button
          type="button"
          onClick={openLocationEditor}
          aria-label="Change location"
          style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 12,
          padding: '10px 14px', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
          border: 'none', color: '#fff', width: '100%', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          textAlign: 'left'
        }}>
          <span>📍</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.location?.address || 'Location not set'}
          </span>
          <span style={{ fontSize: 12, opacity: 0.85, whiteSpace: 'nowrap' }}>Change</span>
          <span style={{
            background: 'rgba(255,255,255,0.2)', padding: '2px 8px',
            borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap'
          }}>
            {user?.skillLevel}
          </span>
        </button>
      </div>

      {editingLocation && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          background: 'rgba(0,0,0,0.36)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '110px 16px 16px'
        }}>
          <div style={{
            width: '100%',
            background: '#fff',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 18px 50px rgba(0,0,0,0.22)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800 }}>Choose location</h2>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>Search a place or use your live location.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLocation(false)}
                aria-label="Close location picker"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  cursor: 'pointer',
                  fontSize: 16
                }}
              >
                x
              </button>
            </div>

            {locationError && (
              <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 12px', borderRadius: 10, marginBottom: 12, fontSize: 12 }}>
                {locationError}
              </div>
            )}

            <LocationSearch
              value={locationDraft}
              onChange={setLocationDraft}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ flex: 1 }}
                disabled={savingLocation}
                onClick={() => setEditingLocation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                disabled={savingLocation}
                onClick={saveLocation}
              >
                {savingLocation ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="scroll-content">
        {unreadCount > 0 && (
          <div
            onClick={() => navigate('/notifications')}
            style={{
              background: 'var(--green-light)',
              color: 'var(--green-dark)',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 12,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: 20 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800 }}>You have {unreadCount} new alert{unreadCount === 1 ? '' : 's'}</p>
              <p style={{ fontSize: 12, marginTop: 2 }}>Open notifications to accept or decline match requests.</p>
            </div>
          </div>
        )}

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
