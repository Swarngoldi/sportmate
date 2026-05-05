import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SPORTS = ['Badminton', 'Pickleball', 'Basketball', 'Football', 'Tennis', 'Cricket', 'Table Tennis', 'Volleyball'];
const SKILLS = ['Beginner', 'Intermediate', 'Advanced'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', address: '', skillLevel: 'Intermediate', availability: 'Now', preferredMatchType: 'Singles'
  });
  const [selectedSports, setSelectedSports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const toggleSport = sport => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  const submit = async e => {
    e.preventDefault();
    if (selectedSports.length === 0) { setError('Please select at least one sport'); return; }
    setError(''); setLoading(true);
    try {
      await register({ ...form, sports: selectedSports });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div style={{ background: 'var(--green)', padding: '28px 24px 24px', color: '#fff', flexShrink: 0 }}>
        <Link to="/login" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 13 }}>← Back to login</Link>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, marginTop: 10 }}>Create profile</h1>
        <p style={{ opacity: 0.85, fontSize: 13 }}>Quick setup — takes 30 seconds</p>
      </div>

      <div className="scroll-content">
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" name="name" placeholder="Swarnim Tripathi" value={form.name} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" name="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={handle} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Your locality / area</label>
            <input className="form-input" name="address" placeholder="Dharampeth, Nagpur" value={form.address} onChange={handle} required />
          </div>

          <div className="section-label">Sports I play</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {SPORTS.map(sport => (
              <button
                key={sport} type="button"
                onClick={() => toggleSport(sport)}
                style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: selectedSports.includes(sport) ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: selectedSports.includes(sport) ? 'var(--green-light)' : 'var(--bg2)',
                  color: selectedSports.includes(sport) ? 'var(--green-dark)' : 'var(--text2)',
                  cursor: 'pointer', transition: '0.15s'
                }}
              >
                {sport}
              </button>
            ))}
          </div>

          <div className="section-label">Preferred match type</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['Singles', 'Doubles', 'Teams'].map(type => (
              <button
                key={type} type="button"
                onClick={() => setForm(f => ({ ...f, preferredMatchType: type }))}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                  border: form.preferredMatchType === type ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: form.preferredMatchType === type ? 'var(--green-light)' : 'var(--bg2)',
                  color: form.preferredMatchType === type ? 'var(--green-dark)' : 'var(--text2)',
                  cursor: 'pointer', transition: '0.15s'
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="section-label">When are you free?</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['Now', 'Evening', 'Weekend'].map(slot => (
              <button
                key={slot} type="button"
                onClick={() => setForm(f => ({ ...f, availability: slot }))}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                  border: form.availability === slot ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: form.availability === slot ? 'var(--green-light)' : 'var(--bg2)',
                  color: form.availability === slot ? 'var(--green-dark)' : 'var(--text2)',
                  cursor: 'pointer', transition: '0.15s'
                }}
              >
                {slot}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Start playing →'}
          </button>
        </form>
      </div>
    </div>
  );
}
