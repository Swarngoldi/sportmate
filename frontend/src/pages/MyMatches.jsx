import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';

const STATUS_COLORS = {
  pending: { bg: '#FAEEDA', color: '#633806', label: 'Pending' },
  confirmed: { bg: '#E1F5EE', color: '#085041', label: 'Confirmed' },
  completed: { bg: '#D3D1C7', color: '#2C2C2A', label: 'Completed' },
  cancelled: { bg: '#FCEBEB', color: '#A32D2D', label: 'Cancelled' },
};

const SPORT_EMOJIS = { Badminton:'🏸', Pickleball:'🥒', Basketball:'🏀', Football:'⚽', Tennis:'🎾', Cricket:'🏏', 'Table Tennis':'🏓', Volleyball:'🏐' };

export default function MyMatches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(state?.notice || '');

  useEffect(() => {
    api.get('/matches').then(res => setMatches(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const opponent = (match) => match.players?.find(p => p._id !== user?._id);
  const openMatch = (match, opp) => {
    if (match.status !== 'confirmed') {
      setNotice('Chat opens after this match is confirmed.');
      return;
    }
    navigate(`/chat/${match._id}`, { state: { match, opponent: opp, court: match.court } });
  };

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>My Matches</h1>
        <p>{matches.length} total · confirmed matches open chat</p>
      </div>

      <div className="scroll-content">
        {notice && (
          <div style={{ background: 'var(--green-light)', color: 'var(--green-dark)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
            {notice}
          </div>
        )}

        {loading && <div className="loading"><div className="spinner"></div></div>}

        {!loading && matches.length === 0 && (
          <div className="empty-state">
            <span className="emoji">🎯</span>
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16 }}>No matches yet</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Go to Home, pick a sport and find your first playing partner!</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Find players</button>
          </div>
        )}

        {matches.map(match => {
          const opp = opponent(match);
          const status = STATUS_COLORS[match.status] || STATUS_COLORS.pending;
          return (
            <div
              key={match._id}
              onClick={() => openMatch(match, opp)}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16,
                padding: 14, marginBottom: 10, cursor: 'pointer', transition: '0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 28 }}>{SPORT_EMOJIS[match.sport] || '🏅'}</span>
                  <div>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15 }}>{match.sport} · {match.matchType}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>vs {opp?.name || 'Opponent'}</div>
                  </div>
                </div>
                <span style={{ background: status.bg, color: status.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  {status.label}
                </span>
              </div>
              {match.court && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 6 }}>
                  <span>📍</span> {match.court.name}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text2)' }}>
                {new Date(match.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {match.status !== 'confirmed' && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>
                  Waiting for confirmation before chat opens.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NavBar />
    </div>
  );
}
