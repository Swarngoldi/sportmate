import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import NavBar from '../components/NavBar';
import LocationSearch from '../components/LocationSearch';

const ALL_SPORTS = ['Badminton', 'Pickleball', 'Basketball', 'Football', 'Tennis', 'Cricket', 'Table Tennis', 'Volleyball'];
const SKILLS = ['Beginner', 'Intermediate', 'Advanced'];
const AVAIL = ['Now', 'Evening', 'Weekend'];

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    location: {
      address: user?.location?.address || '',
      lat: user?.location?.lat || 0,
      lng: user?.location?.lng || 0
    },
    skillLevel: user?.skillLevel || 'Intermediate',
    availability: user?.availability || 'Now',
    preferredMatchType: user?.preferredMatchType || 'Singles'
  });
  const [sports, setSports] = useState(user?.sports || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setForm(f => ({
      ...f,
      name: user?.name || '',
      location: {
        address: user?.location?.address || '',
        lat: user?.location?.lat || 0,
        lng: user?.location?.lng || 0
      }
    }));
  }, [user?.name, user?.location?.address, user?.location?.lat, user?.location?.lng]);

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || 'U';

  const toggleSport = s => setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        name: form.name,
        address: form.location.address,
        lat: form.location.lat,
        lng: form.location.lng,
        sports,
        preferredMatchType: form.preferredMatchType,
        skillLevel: form.skillLevel,
        availability: form.availability
      };

      const res = await api.put('/users/me', payload);
      updateUser({ ...res.data });
      setMsg('Profile saved!');
      setEditing(false);
    } catch {
      setMsg('Save failed');
    }
    setSaving(false);
  };

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
    const countUpdate = (event) => setUnreadCount(typeof event.detail?.count === 'number' ? event.detail.count : 0);
    window.addEventListener('sportmate:notifications-refresh', refresh);
    window.addEventListener('sportmate:notification-new', refresh);
    window.addEventListener('sportmate:notifications-count', countUpdate);
    return () => {
      window.removeEventListener('sportmate:notifications-refresh', refresh);
      window.removeEventListener('sportmate:notification-new', refresh);
      window.removeEventListener('sportmate:notifications-count', countUpdate);
    };
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell">
      <div style={{ background: 'var(--green)', padding: '28px 20px 32px', color: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>My Profile</div>
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
                lineHeight: 1,
                zIndex: 10,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#fff'
          }}>{initials}</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>{user?.name}</h1>
            <p style={{ opacity: 0.85, fontSize: 13, marginTop: 2 }}>{user?.location?.address}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{user?.skillLevel}</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🎯 {user?.preferredMatchType || 'Singles'}</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>⭐ {user?.trustScore || 100} trust</span>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-content">
        {msg && (
          <div style={{ background: msg.includes('saved') ? 'var(--green-light)' : '#FCEBEB', color: msg.includes('saved') ? 'var(--green-dark)' : '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13 }}>
            {msg}
          </div>
        )}

        {!editing ? (
          <>
            <div className="section-label">My sports</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {(user?.sports || []).map(s => <span key={s} className="chip chip-green" style={{ fontSize: 13, padding: '5px 12px' }}>{s}</span>)}
            </div>

            <div className="section-label">Preferred match type</div>
            <p style={{ fontSize: 14, color: 'var(--text)' }}>{user?.preferredMatchType || 'Singles'}</p>

            <div className="section-label">Availability</div>
            <p style={{ fontSize: 14, color: 'var(--text)' }}>{user?.availability || 'Not set'}</p>

            <button className="btn btn-outline" style={{ marginTop: 24 }} onClick={() => setEditing(true)}>Edit profile</button>
            <button className="btn btn-primary" style={{ marginTop: 10, background: '#A32D2D' }} onClick={handleLogout}>Sign out</button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Your location</label>
              <LocationSearch
                value={form.location}
                onChange={(location) => setForm(f => ({ ...f, location }))}
              />
            </div>

            <div className="section-label">Sports</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {ALL_SPORTS.map(s => (
                <button key={s} type="button" onClick={() => toggleSport(s)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: '0.15s',
                  border: sports.includes(s) ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: sports.includes(s) ? 'var(--green-light)' : 'var(--bg2)',
                  color: sports.includes(s) ? 'var(--green-dark)' : 'var(--text2)'
                }}>{s}</button>
              ))}
            </div>

            <div className="section-label">Skill level</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {SKILLS.map(s => (
                <button key={s} type="button" onClick={() => setForm(f => ({ ...f, skillLevel: s }))} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: '0.15s',
                  border: form.skillLevel === s ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: form.skillLevel === s ? 'var(--green-light)' : 'var(--bg2)',
                  color: form.skillLevel === s ? 'var(--green-dark)' : 'var(--text2)'
                }}>{s}</button>
              ))}
            </div>

            <div className="section-label">Preferred match type</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['Singles', 'Doubles', 'Teams'].map(type => (
                <button key={type} type="button" onClick={() => setForm(f => ({ ...f, preferredMatchType: type }))} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: '0.15s',
                  border: form.preferredMatchType === type ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: form.preferredMatchType === type ? 'var(--green-light)' : 'var(--bg2)',
                  color: form.preferredMatchType === type ? 'var(--green-dark)' : 'var(--text2)'
                }}>{type}</button>
              ))}
            </div>

            <div className="section-label">Availability</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {AVAIL.map(a => (
                <button key={a} type="button" onClick={() => setForm(f => ({ ...f, availability: a }))} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: '0.15s',
                  border: form.availability === a ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: form.availability === a ? 'var(--green-light)' : 'var(--bg2)',
                  color: form.availability === a ? 'var(--green-dark)' : 'var(--text2)'
                }}>{a}</button>
              ))}
            </div>

            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setEditing(false)}>Cancel</button>
          </>
        )}
      </div>

      <NavBar />
    </div>
  );
}
