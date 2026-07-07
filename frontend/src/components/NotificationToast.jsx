import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const titleForType = {
  match_request: 'New match request',
  match_accepted: 'Request accepted',
  match_declined: 'Request declined',
  match_cancelled: 'Match cancelled'
};

const buildMessage = (notification) => {
  const sender = notification?.sender?.name || 'Someone';
  const sport = notification?.match?.sport || 'a match';
  const court = notification?.match?.court?.name;

  if (notification?.type === 'match_request') {
    return `${sender} wants to play ${sport}${court ? ` at ${court}` : ''}.`;
  }
  if (notification?.type === 'match_accepted') return `${sender} accepted your ${sport} request.`;
  if (notification?.type === 'match_declined') return `${sender} declined your ${sport} request.`;
  if (notification?.type === 'match_cancelled') return `${sender} cancelled the ${sport} match.`;
  return 'You have a new notification.';
};

export default function NotificationToast() {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const onNewNotification = (event) => {
      const nextNotification = event.detail?.notification;
      if (!nextNotification?._id) return;

      window.clearTimeout(timerRef.current);
      setNotification(nextNotification);
      timerRef.current = window.setTimeout(() => setNotification(null), 9000);
    };

    window.addEventListener('sportmate:notification-new', onNewNotification);
    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener('sportmate:notification-new', onNewNotification);
    };
  }, []);

  if (!notification) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(394px, calc(100vw - 24px))',
        zIndex: 1000,
        background: '#fff',
        border: '2px solid var(--green)',
        borderRadius: 14,
        boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
        padding: 14
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15 }}>
            {titleForType[notification.type] || 'New notification'}
          </div>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 5, lineHeight: 1.45 }}>
            {buildMessage(notification)}
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => setNotification(null)}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            width: 28,
            height: 28,
            borderRadius: 9,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          x
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ flex: 1 }}
          onClick={() => {
            setNotification(null);
            navigate('/notifications');
          }}
        >
          View
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ flex: 1 }}
          onClick={() => {
            setNotification(null);
            navigate('/matches');
          }}
        >
          Matches
        </button>
      </div>
    </div>
  );
}
