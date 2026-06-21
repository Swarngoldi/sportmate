import { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'google-identity-services';

export default function GoogleSignIn({ onCredential, onError, text = 'continue_with' }) {
  const buttonRef = useRef(null);
  const [configured] = useState(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID));

  useEffect(() => {
    if (!configured || !buttonRef.current) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;
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
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      renderButton();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    script.onerror = () => onError?.('Google sign-in could not be loaded');
    document.head.appendChild(script);
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

  return <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />;
}
