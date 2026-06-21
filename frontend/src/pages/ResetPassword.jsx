import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [form, setForm] = useState({
    email: params.get('email') || '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email: form.email, token, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/login" className="back-btn" style={{ textDecoration: 'none' }}>Back to login</Link>
        <h1>Choose new password</h1>
        <p>Your reset link is valid for one hour</p>
      </div>

      <div style={{ padding: 24, flex: 1 }}>
        {error && (
          <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" name="email" type="email" value={form.email} onChange={handle} required />
          </div>

          <div className="form-group">
            <label className="form-label">New password</label>
            <input className="form-input" name="password" type="password" minLength={6} value={form.password} onChange={handle} required />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input className="form-input" name="confirmPassword" type="password" minLength={6} value={form.confirmPassword} onChange={handle} required />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
