import { useState, useCallback, useEffect } from 'react';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(state?.notice || '');
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/matches');
      setMatches(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
    fetchUnreadCount();
  }, [loadMatches, fetchUnreadCount]);

  useEffect(() => {
    const refresh = () => {
      loadMatches();
      fetchUnreadCount();
    };
    const countUpdate = (event) => setUnreadCount(typeof event.detail?.count === 'number' ? event.detail.count : 0);
    window.addEventListener('sportmate:notification-new', refresh);
    window.addEventListener('sportmate:notifications-refresh', refresh);
    window.addEventListener('sportmate:notifications-count', countUpdate);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('sportmate:notification-new', refresh);
      window.removeEventListener('sportmate:notifications-refresh', refresh);
      window.removeEventListener('sportmate:notifications-count', countUpdate);
      window.removeEventListener('focus', refresh);
    };
  }, [loadMatches, fetchUnreadCount]);

  const opponent = (match) => match.players?.find(p => String(p._id) !== String(user?._id));
  const initiatorId = (match) => String(match.initiator?._id || match.initiator || '');
  const isIncomingPending = (match) => match.status === 'pending' && initiatorId(match) !== String(user?._id);

  const openMatch = (match, opp) => {
    if (match.status !== 'confirmed') {
      setNotice(isIncomingPending(match) ? 'This request needs your response before chat opens.' : 'Chat opens after this match is confirmed.');
      return;
    }
    navigate(`/chat/${match._id}`, { state: { match, opponent: opp, court: match.court } });
  };

  const actOnMatch = async (event, match, action) => {
    event.stopPropagation();
    if (actionId) return;

    setActionId(match._id);
    setError('');
    setNotice('');

    try {
      const res = await api.put(`/matches/${match._id}/${action}`);
      setMatches(prev => prev.map(item => item._id === match._id ? res.data : item));
      window.dispatchEvent(new Event('sportmate:notifications-refresh'));

      if (action === 'accept') {
        navigate(`/chat/${res.data._id}`, { state: { match: res.data, opponent: opponent(res.data), court: res.data.court } });
      } else {
        setNotice('Request declined.');
      }
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${action} request`);
    } finally {
      setActionId('');
    }
  };

  const clearMatch = async (event, match) => {
    event.stopPropagation();
    if (actionId) return;

    const pending = match.status === 'pending';
    const message = pending
      ? 'Clear this pending match? This will decline or cancel the request.'
      : 'Clear this match from your dashboard?';

    if (!window.confirm(message)) return;

    setActionId(match._id);
    setError('');
    setNotice('');

    try {
      const res = await api.delete(`/matches/${match._id}`);
      setMatches(prev => prev.filter(item => item._id !== match._id));
      window.dispatchEvent(new Event('sportmate:notifications-refresh'));
      setNotice(res.data?.declined ? 'Request declined and cleared.' : 'Match cleared from your dashboard.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not clear match');
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="app-shell">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>My Matches</h1>
          <p>{matches.length} total · confirmed matches open chat</p>
        </div>
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
            position: 'relative',
            flexShrink: 0
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

      <div className="scroll-content">
        {notice && (
          <div style={{ background: 'var(--green-light)', color: 'var(--green-dark)', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
            {notice}
          </div>
        )}

        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
            {error}
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
          const incoming = isIncomingPending(match);
          const busy = actionId === match._id;
          return (
            <div
              key={match._id}
              onClick={() => openMatch(match, opp)}
              style={{
                background: incoming ? 'var(--green-light)' : 'var(--bg)',
                border: incoming ? '2px solid var(--green)' : '1px solid var(--border)',
                borderRadius: 16,
                padding: 14, marginBottom: 10, cursor: 'pointer', transition: '0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = incoming ? 'var(--green)' : 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 28 }}>{SPORT_EMOJIS[match.sport] || '🏅'}</span>
                  <div>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15 }}>{match.sport} · {match.matchType}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                      {incoming ? 'Request from' : 'With'} {opp?.name || 'Opponent'}
                    </div>
                    {opp?.email && (
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opp.email}
                      </div>
                    )}
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
                <div style={{ marginTop: 8, fontSize: 12, color: incoming ? 'var(--green-dark)' : 'var(--text2)', fontWeight: incoming ? 700 : 500 }}>
                  {incoming ? 'This player is waiting for your response.' : 'Waiting for confirmation before chat opens.'}
                </div>
              )}
              {incoming && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onClick={(event) => actOnMatch(event, match, 'decline')}
                  >
                    Decline
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onClick={(event) => actOnMatch(event, match, 'accept')}
                  >
                    {busy ? 'Saving...' : 'Accept'}
                  </button>
                </div>
              )}
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 10, width: '100%' }}
                disabled={busy}
                onClick={(event) => clearMatch(event, match)}
              >
                Clear from my matches
              </button>
            </div>
          );
        })}
      </div>

      <NavBar />
    </div>
  );
}
