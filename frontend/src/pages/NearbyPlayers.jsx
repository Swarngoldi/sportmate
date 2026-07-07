import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import NavBar from '../components/NavBar';

export default function NearbyPlayers() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { sport, playerCount, availability } = state || {};

  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requiredSelection = playerCount || 0;

  useEffect(() => {
    if (!sport || playerCount === undefined) {
      navigate('/select-players');
      return;
    }

    if (requiredSelection === 0) {
      setLoading(false);
      return;
    }

    api.get('/users/nearby', { params: { sport, availability } })
      .then(res => setPlayers(res.data))
      .catch(() => setError('Could not load players. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [sport, availability, playerCount, requiredSelection, navigate]);

  const skillColor = { Beginner: 'chip-green', Intermediate: 'chip-amber', Advanced: 'chip-purple' };
  const qualityCopy = {
    best: 'Best match',
    nearby: 'Farther away',
    alternate_time: 'Different time'
  };
  const sportFitCopy = {
    selected_sport: `Plays ${sport}`,
    other_interest: 'Other interests'
  };

  const initials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  const avatarBg = ['#E1F5EE','#EEEDFE','#FAEEDA','#FAECE7','#E6F1FB'];
  const avatarText = ['#085041','#3C3489','#633806','#4A1B0C','#0C447C'];

  const isSelected = (player) => selectedPlayers.some(p => p._id === player._id);
  const toggleSelection = (player) => {
    if (isSelected(player)) {
      setSelectedPlayers(prev => prev.filter(p => p._id !== player._id));
      return;
    }
    if (selectedPlayers.length >= requiredSelection) return;
    setSelectedPlayers(prev => [...prev, player]);
  };

  return (
    <div className="app-shell">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1>Invite players</h1>
        {requiredSelection === 0 ? (
          <p>Solo match for {sport}</p>
        ) : (
          <p>Select {requiredSelection} {requiredSelection === 1 ? 'player' : 'players'}</p>
        )}
      </div>

      <div className="scroll-content">
        {loading && <div className="loading"><div className="spinner"></div></div>}

        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '12px 14px', borderRadius: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        {requiredSelection > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Players invited</div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800 }}>{selectedPlayers.length} / {requiredSelection}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Tap to select</div>
              <div style={{ fontSize: 13, color: selectedPlayers.length < requiredSelection ? 'var(--green-dark)' : 'var(--text2)' }}>{selectedPlayers.length < requiredSelection ? `Choose ${requiredSelection - selectedPlayers.length} more` : 'Filled'}</div>
            </div>
          </div>
        )}

        {requiredSelection === 0 && !loading && (
          <div className="empty-state">
            <span className="emoji">🎉</span>
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16 }}>Solo match ready</p>
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              You're playing solo. Let's find a court!
            </p>
          </div>
        )}

        {requiredSelection > 0 && !loading && !error && players.length === 0 && (
          <div className="empty-state">
            <span className="emoji">😔</span>
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16 }}>No players found nearby</p>
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              No players were found within your nearby search area. Try another availability or invite friends to join.
            </p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>
              Change filters
            </button>
          </div>
        )}

        {requiredSelection > 0 && !loading && players.map((player, i) => {
          const active = isSelected(player);
          return (
            <div
              key={player._id}
              onClick={() => toggleSelection(player)}
              style={{
                background: active ? 'var(--green-light)' : 'var(--bg)',
                border: active ? '2px solid var(--green)' : '1px solid var(--border)',
                borderRadius: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'center',
                marginBottom: 10, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s'
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: avatarBg[i % avatarBg.length], color: avatarText[i % avatarText.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 800, flexShrink: 0
              }}>
                {initials(player.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15 }}>{player.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.location?.address}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.email}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className={`chip ${skillColor[player.skillLevel] || 'chip-green'}`}>{player.skillLevel}</span>
                  {player.matchQuality && (
                    <span className={player.matchQuality === 'best' ? 'chip chip-green' : 'chip chip-purple'}>
                      {qualityCopy[player.matchQuality] || 'Nearby'}
                    </span>
                  )}
                  {player.sportFit && (
                    <span className={player.sportMatch ? 'chip chip-green' : 'chip chip-coral'}>
                      {sportFitCopy[player.sportFit] || 'Interests'}
                    </span>
                  )}
                  {(player.sports?.length ? player.sports : ['No sports added']).slice(0, 3).map(s => (
                    <span key={s} className="chip chip-amber">{s}</span>
                  ))}
                </div>
              </div>

              <div style={{
                background: active ? 'var(--green)' : 'var(--green-light)',
                color: active ? '#fff' : 'var(--green-dark)',
                padding: '6px 10px', borderRadius: 10, textAlign: 'center', flexShrink: 0
              }}>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14 }}>{player.distance}</div>
                <div style={{ fontSize: 10, fontWeight: 500 }}>km</div>
              </div>
            </div>
          );
        })}

        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          disabled={selectedPlayers.length < requiredSelection}
          onClick={() => navigate('/courts', { state: { sport, playerCount, availability, selectedPlayers } })}
        >
          Continue to courts →
        </button>
      </div>

      <NavBar />
    </div>
  );
}
