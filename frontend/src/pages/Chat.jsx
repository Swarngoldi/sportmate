import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { matchId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [matchData, setMatchData] = useState(state?.match || null);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const opponent = state?.opponent;
  const court = state?.court;

  const loadMessages = async ({ silent = false } = {}) => {
    try {
      const res = await api.get(`/chat/${matchId}`);
      setMessages(res.data);
      setError('');
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || 'Chat is not available yet');
    }
  };

  useEffect(() => {
    loadMessages();
    if (!matchData) {
      api.get(`/matches/${matchId}`)
        .then(res => {
          setMatchData(res.data);
          if (res.data.status !== 'confirmed') setError('Chat opens after the match is confirmed');
        })
        .catch(() => {});
    } else if (matchData.status !== 'confirmed') {
      setError('Chat opens after the match is confirmed');
    }
  }, [matchId]);

  useEffect(() => {
    if (matchData?.status !== 'confirmed') return;

    const intervalId = setInterval(() => {
      loadMessages({ silent: true });
    }, 2000);

    return () => clearInterval(intervalId);
  }, [matchId, matchData?.status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending || matchData?.status !== 'confirmed') return;
    setSending(true);
    try {
      const res = await api.post(`/chat/${matchId}`, { text });
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch {}
    setSending(false);
  };

  const opponentName = opponent?.name || matchData?.players?.find(p => p._id !== user?._id)?.name || 'Opponent';
  const initials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <div className="app-shell">
      <div style={{ background: 'var(--green)', color: '#fff', padding: '16px', flexShrink: 0 }}>
        <button className="back-btn" onClick={() => navigate('/matches')}>← My matches</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0
          }}>{initials(opponentName)}</div>
          <div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16 }}>{opponentName}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {matchData?.sport} · {court?.name || 'Court TBD'}
            </div>
          </div>
        </div>
      </div>

      {/* Match info banner */}
      <div style={{ background: 'var(--green-light)', padding: '10px 16px', fontSize: 12, color: 'var(--green-dark)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span>📍</span>
        <span>{court?.name || 'Court not confirmed'} · {matchData?.availability || ''}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '12px 14px', borderRadius: 12, marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text2)' }}>
            <p style={{ fontSize: 32 }}>👋</p>
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, marginTop: 8 }}>
              {matchData?.status === 'confirmed' ? 'Match confirmed!' : 'Waiting for confirmation'}
            </p>
            <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>Say hi to {opponentName?.split(' ')[0]} and coordinate your game.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe ? 'var(--green)' : 'var(--bg2)',
                color: isMe ? '#fff' : 'var(--text)',
                fontSize: 14, lineHeight: 1.5
              }}>
                {msg.text}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 8, borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <input
          style={{
            flex: 1, padding: '11px 14px', borderRadius: 24, border: '1.5px solid var(--border)',
            background: 'var(--bg2)', fontFamily: 'DM Sans,sans-serif', fontSize: 14,
            color: 'var(--text)', outline: 'none'
          }}
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={matchData?.status !== 'confirmed'}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim() || matchData?.status !== 'confirmed'}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: text.trim() ? 'var(--green)' : 'var(--bg2)',
            color: text.trim() ? '#fff' : 'var(--text2)',
            fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: '0.15s', flexShrink: 0
          }}
        >→</button>
      </div>
    </div>
  );
}
