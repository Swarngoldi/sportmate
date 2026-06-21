import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getCurrentLocationWithAddress } from '../utils/location';

const SESSION_PROMPT_KEY = 'sm_location_prompt_seen';

export default function AppLocationSync() {
  const location = useLocation();
  const { user, loading, updateUser } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const saveLocation = async (location) => {
    const token = localStorage.getItem('sm_token');
    if (!token) return;

    const res = await api.put('/users/me', {
      address: location.address,
      lat: location.lat,
      lng: location.lng
    });
    updateUser({ ...res.data });
  };

  const requestLocation = async () => {
    setLocating(true);
    setError('');

    try {
      const location = await getCurrentLocationWithAddress();
      sessionStorage.setItem(SESSION_PROMPT_KEY, 'true');
      setShowPrompt(false);
      await saveLocation(location);
    } catch (err) {
      setError(err.message || 'Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  const skipLocation = () => {
    sessionStorage.setItem(SESSION_PROMPT_KEY, 'true');
    setShowPrompt(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!user?._id) {
      setShowPrompt(false);
      return;
    }
    if (location.pathname !== '/') {
      setShowPrompt(false);
      return;
    }
    if (sessionStorage.getItem(SESSION_PROMPT_KEY)) return;
    setShowPrompt(true);
  }, [loading, location.pathname, user?._id]);

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.36)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18
    }}>
      <div style={{
        width: '100%',
        maxWidth: 390,
        background: '#fff',
        borderRadius: 18,
        padding: 20,
        boxShadow: '0 24px 70px rgba(0,0,0,0.22)'
      }}>
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: 'var(--green-light)',
          color: 'var(--green-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          marginBottom: 14
        }}>
          📍
        </div>

        <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800 }}>
          Use your current location?
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
          SportMate uses your location to show nearby players and courts. It will be saved to your profile now that you are signed in.
        </p>

        {error && (
          <div style={{
            background: '#FCEBEB',
            color: '#A32D2D',
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 12,
            marginTop: 14
          }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={requestLocation} disabled={locating}>
          {locating ? 'Detecting location...' : 'Use current location'}
        </button>
        <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={skipLocation} disabled={locating}>
          Not now
        </button>
      </div>
    </div>
  );
}
