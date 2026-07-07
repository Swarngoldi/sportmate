import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';

const TYPE_COPY = {
  match_request: {
    title: 'Match request',
    tone: { bg: 'var(--green-light)', color: 'var(--green-dark)' }
  },
  match_accepted: {
    title: 'Request accepted',
    tone: { bg: 'var(--green-light)', color: 'var(--green-dark)' }
  },
  match_declined: {
    title: 'Request declined',
    tone: { bg: '#FCEBEB', color: '#A32D2D' }
  },
  match_cancelled: {
    title: 'Match cancelled',
    tone: { bg: '#FCEBEB', color: '#A32D2D' }
  }
};

const SPORT_EMOJIS = {
  Badminton: '🏸',
  Pickleball: '🥒',
  Basketball: '🏀',
  Football: '⚽',
  Tennis: '🎾',
  Cricket: '🏏',
  'Table Tennis': '🏓',
  Volleyball: '🏐'
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    setError('');
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      if (res.data.some(notification => !notification.read)) {
        await api.put('/notifications/mark-all-read');
        setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
        window.dispatchEvent(new Event('sportmate:notifications-refresh'));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const onNewNotification = (event) => {
      const notification = event.detail?.notification;
      if (!notification?._id) return;
      setNotifications(prev => {
        if (prev.some(item => item._id === notification._id)) return prev;
        return [{ ...notification, read: true }, ...prev];
      });
      api.put(`/notifications/${notification._id}/read`)
        .then(() => window.dispatchEvent(new Event('sportmate:notifications-refresh')))
        .catch(() => {});
      setLoading(false);
    };

    window.addEventListener('sportmate:notification-new', onNewNotification);
    return () => window.removeEventListener('sportmate:notification-new', onNewNotification);
  }, []);

  const actOnRequest = async (notification, action) => {
    if (!notification.match?._id || actionId) return;
    setActionId(notification._id);
    setError('');

    try {
      const res = await api.put(`/matches/${notification.match._id}/${action}`);
      setNotifications(prev => prev.map(item => (
        item._id === notification._id
          ? { ...item, read: true, match: res.data }
          : item
      )));
      window.dispatchEvent(new Event('sportmate:notifications-refresh'));

      if (action === 'accept') {
        navigate(`/chat/${res.data._id}`, {
          state: { match: res.data, court: res.data.court }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${action} request`);
    } finally {
      setActionId('');
    }
  };

  const openMatch = (notification) => {
    if (!notification.match?._id) return;
    if (notification.match.status === 'confirmed') {
      navigate(`/chat/${notification.match._id}`, {
        state: { match: notification.match, court: notification.match.court }
      });
    } else {
      navigate('/matches');
    }
  };

  const buildMessage = (notification) => {
    const name = notification.sender?.name || 'Someone';
    const sport = notification.match?.sport || 'a match';
    const court = notification.match?.court?.name;

    if (notification.type === 'match_request') {
      return `${name} wants to play ${sport}${court ? ` at ${court}` : ''}.`;
    }
    if (notification.type === 'match_accepted') {
      return `${name} accepted your ${sport} request. Your match is booked.`;
    }
    if (notification.type === 'match_declined') {
      return `${name} declined your ${sport} request.`;
    }
    if (notification.type === 'match_cancelled') {
      return `${name} cancelled the ${sport} match.`;
    }
    return 'You have a new update.';
  };

  return (
    <div className="app-shell">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <h1>Notifications</h1>
            <p>Match requests, accepts and booking updates</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notification-dashboard')}
            style={{
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.14)',
              color: '#fff',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              whiteSpace: 'nowrap'
            }}
          >
            Health
          </button>
        </div>
      </div>

      <div className="scroll-content">
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && <div className="loading"><div className="spinner"></div></div>}

        {!loading && notifications.length === 0 && (
          <div className="empty-state">
            <span className="emoji">🔔</span>
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16 }}>No notifications yet</p>
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>Requests and accepted matches will show up here.</p>
          </div>
        )}

        {!loading && notifications.map(notification => {
          const copy = TYPE_COPY[notification.type] || TYPE_COPY.match_request;
          const match = notification.match;
          const initiatorId = typeof match?.initiator === 'object' ? match.initiator?._id : match?.initiator;
          const isRequestForMe = notification.type === 'match_request'
            && match?.status === 'pending'
            && String(initiatorId) !== String(user?._id);
          const canOpenChat = match?.status === 'confirmed';
          const isBusy = actionId === notification._id;

          return (
            <div
              key={notification._id}
              style={{
                background: 'var(--bg)',
                border: notification.read ? '1px solid var(--border)' : '2px solid var(--green)',
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
                boxShadow: notification.read ? 'none' : 'var(--shadow)'
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: copy.tone.bg,
                  color: copy.tone.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0
                }}>
                  {SPORT_EMOJIS[match?.sport] || '🔔'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15 }}>{copy.title}</div>
                    <span style={{
                      background: copy.tone.bg,
                      color: copy.tone.color,
                      padding: '3px 9px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      flexShrink: 0
                    }}>
                      {match?.status || 'new'}
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, lineHeight: 1.5 }}>
                    {buildMessage(notification)}
                  </p>

                  {match?.availability && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span className="chip chip-green">{match.sport}</span>
                      <span className="chip chip-amber">{match.availability}</span>
                      {match.court?.name && <span className="chip chip-purple">{match.court.name}</span>}
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 10 }}>
                    {new Date(notification.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {isRequestForMe && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    disabled={isBusy}
                    onClick={() => actOnRequest(notification, 'decline')}
                  >
                    Decline
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={isBusy}
                    onClick={() => actOnRequest(notification, 'accept')}
                  >
                    {isBusy ? 'Saving...' : 'Accept'}
                  </button>
                </div>
              )}

              {!isRequestForMe && canOpenChat && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 14 }}
                  onClick={() => openMatch(notification)}
                >
                  Open chat
                </button>
              )}
            </div>
          );
        })}
      </div>

      <NavBar />
    </div>
  );
}
