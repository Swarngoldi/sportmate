import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignIn from '../components/GoogleSignIn';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setGoogleLoading(true);
    try {
      await googleLogin(credential);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div style={{ background: 'var(--green)', padding: '48px 24px 36px', textAlign: 'center', color: '#fff', flexShrink: 0 }}>
        <div style={{ fontSize: 48 }}>🏸</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, marginTop: 8 }}>SportMate</h1>
        <p style={{ opacity: 0.85, marginTop: 4, fontSize: 14 }}>Play more. Fight loneliness. Find your people.</p>
      </div>

      <div style={{ padding: 24, flex: 1 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Welcome back</h2>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" name="email" type="email" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" name="password" type="password" placeholder="••••••••"
              value={form.password} onChange={handle} required />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Link to="/forgot-password" style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
          <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
          <span style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 700 }}>OR</span>
          <div style={{ height: 1, background: 'var(--border)', flex: 1 }} />
        </div>

        <div style={{ opacity: googleLoading ? 0.65 : 1, pointerEvents: googleLoading ? 'none' : 'auto' }}>
          <GoogleSignIn
            onCredential={handleGoogleCredential}
            onError={setError}
            text="signin_with"
          />
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text2)' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
            Create one free
          </Link>
        </p>

        <div style={{ marginTop: 28, background: 'var(--green-light)', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 12, color: 'var(--green-dark)', fontWeight: 600, marginBottom: 4 }}>Demo account</p>
          <p style={{ fontSize: 12, color: 'var(--green-dark)' }}>Email: rahul@demo.com</p>
          <p style={{ fontSize: 12, color: 'var(--green-dark)' }}>Password: demo1234</p>
        </div>
      </div>
    </div>
  );
}
