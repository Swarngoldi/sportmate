import { useEffect, useRef, useState } from 'react';
import { formatPlaceLabel, getCurrentLocationWithAddress } from '../utils/location';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function LocationSearch({ value, onChange, onLocationUpdate }) {
  const [input, setInput] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const autocompleteServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const placesServiceRef = useRef(null);

  useEffect(() => {
    setInput(value?.address || '');
  }, [value?.address]);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;

    const createServices = () => {
      if (window.google?.maps?.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setPlacesLoaded(true);
      }
    };

    if (window.google?.maps?.places) {
      createServices();
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => createServices(), { once: true });
      existingScript.addEventListener('error', () => setPlacesLoaded(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => createServices();
    script.onerror = () => {
      console.error('Failed to load Google Maps Places script');
      setPlacesLoaded(false);
    };
    document.head.appendChild(script);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    if (!placesLoaded || !autocompleteServiceRef.current) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: val,
        sessionToken: sessionTokenRef.current,
        componentRestrictions: { country: 'IN' }
      },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
          if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.warn('Places autocomplete status:', status);
          }
        }
        setLoading(false);
      }
    );
  };

  const selectSuggestion = (place) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId: place.place_id, sessionToken: sessionTokenRef.current },
      (details, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && details.geometry?.location) {
          const lat = details.geometry.location.lat();
          const lng = details.geometry.location.lng();
          const address = formatPlaceLabel(details);

          setInput(address);
          setSuggestions([]);
          onChange({ address, lat, lng });
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      }
    );
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const location = await getCurrentLocationWithAddress();
      setInput(location.address);
      setSuggestions([]);
      onChange(location);
      onLocationUpdate?.(location.lat, location.lng, location.address);
    } catch (error) {
      alert('Could not get location: ' + error.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              className="form-input"
              type="text"
              placeholder="Search location..."
              value={input}
              onChange={handleInputChange}
              style={{
                paddingLeft: 40,
                fontSize: 14
              }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
              📍
            </span>
          </div>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--green)',
              background: 'var(--green-light)',
              color: 'var(--green-dark)',
              fontWeight: 500,
              fontSize: 12,
              cursor: locating ? 'default' : 'pointer',
              opacity: locating ? 0.6 : 1,
              transition: '0.15s'
            }}
          >
            {locating ? '...' : 'Live'}
          </button>
        </div>

        {(loading || suggestions.length > 0) && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #D1D5DB',
              marginTop: 8,
              zIndex: 999,
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: '#111' }}>Loading suggestions…</div>
            ) : (
              suggestions.map((place, idx) => {
                const title = place.main_text || place.description || place.structured_formatting?.main_text || 'Location';
                const subtitle = place.secondary_text || place.structured_formatting?.secondary_text || '';
                return (
                  <div
                    key={idx}
                    onClick={() => selectSuggestion(place)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: idx < suggestions.length - 1 ? '1px solid #E5E7EB' : 'none',
                      cursor: 'pointer',
                      transition: '0.1s',
                      fontSize: 13,
                      color: '#111',
                      background: '#fff'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ fontWeight: 500, color: '#111' }}>{title}</div>
                    {subtitle && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{subtitle}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
