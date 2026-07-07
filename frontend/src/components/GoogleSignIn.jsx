import { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'google-identity-services';

export default function GoogleSignIn({ onCredential, onError, text = 'continue_with' }) {
  const buttonRef = useRef(null);
  const [configured] = useState(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID));
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured || !buttonRef.current) return;
    let cancelled = false;
    let fallbackTimer;

    const renderButton = () => {
      if (cancelled || !buttonRef.current) return;
      if (!window.google?.accounts?.id) {
        setLoading(false);
        onError?.('Google sign-in could not be loaded. Check your OAuth origin and internet connection.');
        return;
      }

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) onCredential(response.credential);
        }
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: Math.min(360, Math.max(240, buttonRef.current.parentElement?.clientWidth || 320)),
        text
      });
      setLoading(false);
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      if (window.google?.accounts?.id) {
        renderButton();
      } else {
        existingScript.addEventListener('load', renderButton, { once: true });
        existingScript.addEventListener('error', () => {
          setLoading(false);
          onError?.('Google sign-in could not be loaded');
        }, { once: true });
      }
      fallbackTimer = window.setTimeout(() => {
        if (!cancelled && buttonRef.current && !buttonRef.current.children.length) {
          setLoading(false);
          onError?.('Google sign-in is not available yet. Refresh the page after confirming your Google OAuth origin.');
        }
      }, 5000);
      return () => {
        cancelled = true;
        window.clearTimeout(fallbackTimer);
        existingScript.removeEventListener('load', renderButton);
      };
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    script.onerror = () => {
      setLoading(false);
      onError?.('Google sign-in could not be loaded');
    };
    document.head.appendChild(script);

    fallbackTimer = window.setTimeout(() => {
      if (!cancelled && buttonRef.current && !buttonRef.current.children.length) {
        setLoading(false);
        onError?.('Google sign-in is not available yet. Refresh the page after confirming your Google OAuth origin.');
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, [configured, onCredential, onError, text]);

  if (!configured) {
    return (
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => onError?.('Add VITE_GOOGLE_CLIENT_ID to enable Google sign-in')}
      >
        Continue with Google
      </button>
    );
  }

  return (
    <div aria-busy={loading} style={{ minHeight: 44 }}>
      <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
      {loading ? (
        <div style={{ marginTop: -34, textAlign: 'center', color: 'var(--text2)', fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>
          Loading Google...
        </div>
      ) : null}
    </div>
  );
}
