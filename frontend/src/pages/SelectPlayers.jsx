import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar';

const AVAILABILITY = [
  { label: 'Now', value: 'Now', icon: '⚡' },
  { label: 'Evening', value: 'Evening', icon: '🌆' },
  { label: 'Weekend', value: 'Weekend', icon: '🗓️' },
];

export default function SelectPlayers() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const sport = state?.sport || 'Badminton';

  const [playerCount, setPlayerCount] = useState(0);
  const [availability, setAvailability] = useState('Now');

  const SPORT_EMOJIS = { Badminton:'🏸', Pickleball:'🥒', Basketball:'🏀', Football:'⚽', Tennis:'🎾', Cricket:'🏏', 'Table Tennis':'🏓', Volleyball:'🏐' };

  return (
    <div className="app-shell">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>{SPORT_EMOJIS[sport] || '🏅'} {sport}</h1>
        <p>Choose total players for the match</p>
      </div>

      <div className="scroll-content">
        <div className="section-label">Number of players</div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setPlayerCount(Math.max(0, playerCount - 1))}
            style={{ minWidth: 60, fontSize: 18 }}
          >
            −
          </button>
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontSize: 48, fontWeight: 800, fontFamily: 'Syne,sans-serif' }}>{playerCount}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>players</div>
          </div>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => setPlayerCount(playerCount + 1)}
            style={{ minWidth: 60, fontSize: 18 }}
          >
            +
          </button>
        </div>

        <div className="section-label">When do you want to play?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {AVAILABILITY.map(av => (
            <div
              key={av.value}
              onClick={() => setAvailability(av.value)}
              style={{
                flex: 1, background: availability === av.value ? 'var(--green-light)' : 'var(--bg2)',
                border: availability === av.value ? '2px solid var(--green)' : '2px solid transparent',
                borderRadius: 14, padding: '14px 8px', textAlign: 'center', cursor: 'pointer', transition: '0.15s'
              }}
            >
              <div style={{ fontSize: 22 }}>{av.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: availability === av.value ? 'var(--green-dark)' : 'var(--text)', marginTop: 6 }}>{av.label}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 24 }}
          onClick={() => navigate('/nearby-players', { state: { sport, playerCount, availability } })}
        >
          Find players →
        </button>
      </div>

      <NavBar />
    </div>
  );
}
