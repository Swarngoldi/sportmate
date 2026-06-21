import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import NavBar from '../components/NavBar';

export default function ConfirmMatch() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { sport, playerCount, availability, selectedPlayers, court } = state || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const SPORT_EMOJIS = { Badminton:'🏸', Pickleball:'🥒', Basketball:'🏀', Football:'⚽', Tennis:'🎾', Cricket:'🏏', 'Table Tennis':'🏓', Volleyball:'🏐' };

  useEffect(() => {
    if (!sport || !court) {
      navigate('/');
    }
    if (playerCount > 0 && !selectedPlayers?.length) {
      navigate('/');
    }
  }, [sport, selectedPlayers, court, navigate, playerCount]);

  const confirmMatch = async () => {
    setLoading(true); setError('');
    try {
      const payload = {
        sport,
        playerCount,
        playerIds: playerCount > 0 ? selectedPlayers.map((player) => player._id) : [],
        availability
      };

      if (court?._id) {
        payload.courtId = court._id;
      } else {
        payload.courtPlace = {
          name: court?.name,
          address: court?.address,
          location: court?.location,
          rating: court?.rating,
          pricePerHour: court?.pricePerHour
        };
      }

      const res = await api.post('/matches', payload);
      if (res.data.status === 'confirmed') {
        navigate(`/chat/${res.data._id}`, { state: { match: res.data, players: selectedPlayers || [], court } });
      } else {
        navigate('/matches', {
          state: { notice: 'Request sent. Chat will open after the player accepts.' }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const rows = [
    { icon: SPORT_EMOJIS[sport] || '🏅', key: 'Sport', val: playerCount === 0 ? `${sport} · Solo` : `${sport} · ${playerCount + 1} total` },
    playerCount === 0 
      ? null 
      : { icon: '👥', key: 'Players', val: selectedPlayers?.map((player) => player.name).join(', ') || '—' },
    { icon: '📍', key: 'Court', val: court?.name ? `${court.name}, ${court.address}` : '—' },
    { icon: '🕐', key: 'When', val: availability === 'Now' ? 'Today, as soon as possible' : availability === 'Evening' ? 'Today evening' : 'This weekend' },
    { icon: '💰', key: 'Court fee', val: court?.pricePerHour ? playerCount === 0 ? `₹${court.pricePerHour}/hr` : `₹${court.pricePerHour}/hr · split across ${playerCount + 1}` : 'Free / TBD' }
  ].filter(Boolean);

  return (
    <div className="app-shell">
      <div style={{ background: 'var(--green)', color: '#fff', padding: '20px 16px 24px', textAlign: 'center', flexShrink: 0 }}>
        <button className="back-btn" onClick={() => navigate(-1)} style={{ justifyContent: 'flex-start', width: '100%', marginBottom: 12 }}>← Back</button>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>Almost there!</h1>
        <p style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>Review your match details below</p>
      </div>

      <div className="scroll-content">
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ background: 'var(--bg2)', borderRadius: 16, padding: '4px 14px', marginBottom: 16 }}>
          {rows.map(row => (
            <div key={row.key} style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--border)'
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: 'var(--green-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
              }}>{row.icon}</div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{row.key}</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{row.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--amber-light)', borderRadius: 12, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
          ⚡ {playerCount === 0 
            ? 'Confirming will book your solo match and create a record.'
            : 'Confirming will create a private chat for your selected group and notify everyone.'
          }
        </div>

        <button className="btn btn-primary" onClick={confirmMatch} disabled={loading}>
          {loading ? 'Confirming...' : playerCount === 0 ? `Confirm solo match →` : `Confirm match with ${selectedPlayers?.length || 0} players →`}
        </button>
        <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => navigate('/')}>
          Cancel
        </button>
      </div>

      <NavBar />
    </div>
  );
}
