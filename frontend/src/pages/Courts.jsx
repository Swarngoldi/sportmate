import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import NavBar from '../components/NavBar';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

function loadGoogleMapsScript(key) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google);
      return;
    }

    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function getMidpoint(coords) {
  const total = coords.length;
  const lat = coords.reduce((sum, item) => sum + item.lat, 0) / total;
  const lng = coords.reduce((sum, item) => sum + item.lng, 0) / total;
  return { lat, lng };
}

export default function Courts() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { sport, playerCount, availability, selectedPlayers } = state || {};
  const { user } = useAuth();

  const [courts, setCourts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placesError, setPlacesError] = useState('');
  const [placesResults, setPlacesResults] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const placesMarkersRef = useRef([]);

  useEffect(() => {
    if (!sport) {
      navigate('/select-players');
      return;
    }

    if (playerCount > 0 && !selectedPlayers?.length) {
      navigate('/select-players');
      return;
    }

    console.log('Courts page - User:', user?.name, user?.email);
    console.log('User location:', user?.location);

    const playerIds = playerCount > 0 ? selectedPlayers.map((player) => player._id).join(',') : '';
    api.get('/courts/nearby', { params: { sport, playerIds } })
      .then(res => {
        console.log('Nearby courts:', res.data);
        setCourts(res.data);
        if (res.data.length > 0) setSelected(res.data[0]);
      })
      .catch((err) => {
        console.error('Error loading courts:', err);
        setError('Could not load courts')
      })
      .finally(() => setLoading(false));
  }, [selectedPlayers, sport, navigate, playerCount, user]);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !mapRef.current || (!user?.location && playerCount === 0 && courts.length === 0)) {
      return;
    }

    loadGoogleMapsScript(GOOGLE_MAPS_KEY)
      .then((google) => {
        const coords = [];
        if (playerCount === 0) {
          if (user?.location?.lat && user.location?.lng) {
            coords.push({ lat: user.location.lat, lng: user.location.lng });
          }
        } else if (selectedPlayers?.length) {
          selectedPlayers.forEach((player) => {
            if (player.location?.lat && player.location?.lng) {
              coords.push({ lat: player.location.lat, lng: player.location.lng });
            }
          });
        }
        if (coords.length === 0 && user?.location?.lat && user.location?.lng) {
          coords.push({ lat: user.location.lat, lng: user.location.lng });
        }
        if (coords.length === 0 && courts.length > 0) {
          coords.push({ lat: courts[0].lat, lng: courts[0].lng });
        }

        const center = getMidpoint(coords);
        console.log('Map center coordinates:', center);
        console.log('User location:', user?.location);
        console.log('Selected players:', selectedPlayers);

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
            gestureHandling: 'greedy'
          });
        } else {
          mapInstanceRef.current.setCenter(center);
        }
        setMapReady(true);

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        placesMarkersRef.current.forEach((marker) => marker.setMap(null));
        placesMarkersRef.current = [];

        const infoWindow = new google.maps.InfoWindow();

        if (user?.location?.lat && user.location?.lng) {
          markersRef.current.push(new google.maps.Marker({
            position: { lat: user.location.lat, lng: user.location.lng },
            map: mapInstanceRef.current,
            title: 'You',
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#34D399', fillOpacity: 1, strokeWeight: 0 }
          }));
        }

        if (playerCount > 0 && selectedPlayers?.length) {
          selectedPlayers.forEach((player, idx) => {
            if (player.location?.lat && player.location?.lng) {
              markersRef.current.push(new google.maps.Marker({
                position: { lat: player.location.lat, lng: player.location.lng },
                map: mapInstanceRef.current,
                title: player.name,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#7C3AED', fillOpacity: 1, strokeWeight: 0 }
              }));
            }
          });
        }

        const midpoint = getMidpoint(coords);
        markersRef.current.push(new google.maps.Marker({
          position: midpoint,
          map: mapInstanceRef.current,
          title: 'Midpoint',
          icon: {
            path: 'M12.5,2C8.36,2,5,5.36,5,9.5C5,15.5,12.5,22,12.5,22C12.5,22,20,15.5,20,9.5C20,5.36,16.64,2,12.5,2Z',
            fillColor: '#F59E0B',
            fillOpacity: 1,
            strokeColor: '#B45309',
            strokeWeight: 2,
            scale: 1
          }
        }));

        courts.forEach((court, index) => {
          const marker = new google.maps.Marker({
            position: { lat: court.lat, lng: court.lng },
            map: mapInstanceRef.current,
            title: court.name,
            icon: {
              path: 'M12 2C8.1 2 5 5.1 5 9C5 16.25 12 22 12 22C12 22 19 16.25 19 9C19 5.1 15.9 2 12 2Z',
              fillColor: selected?._id === court._id ? '#10B981' : '#FBBF24',
              fillOpacity: 1,
              strokeColor: '#92400E',
              strokeWeight: 1,
              scale: 1.5
            }
          });

          marker.addListener('click', () => {
            setSelected(court);
            mapInstanceRef.current.panTo({ lat: court.lat, lng: court.lng });
            infoWindow.setContent(`
              <div style="font-family: Arial, sans-serif; font-size: 14px;">
                <strong>${court.name}</strong><br />
                ₹${court.pricePerHour}/hr<br />
                ${court.address}
              </div>
            `);
            infoWindow.open(mapInstanceRef.current, marker);
          });

          markersRef.current.push(marker);
        });

        setPlacesResults([]);
        if (google.maps.places && mapInstanceRef.current) {
          console.log('Places API available, searching around:', midpoint, 'for sport:', sport);
          const service = new google.maps.places.PlacesService(mapInstanceRef.current);
          service.textSearch(
            {
              query: `${sport} court`,
              location: midpoint,
              radius: 5000
            },
            (results, status) => {
              console.log('Places API response:', status, results?.length || 0, 'results');
              if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setPlacesError('No nearby courts were found by Google Places.');
                setPlacesResults([]);
                return;
              }

              if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                setPlacesError('');
                const cleanedPlaces = results.slice(0, 8).map((place) => {
                  if (!place.geometry?.location) return null;
                  return {
                    placeId: place.place_id,
                    name: place.name,
                    address: place.formatted_address || place.vicinity || '',
                    rating: place.rating,
                    location: {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng()
                    }
                  };
                }).filter(Boolean);
                setPlacesResults(cleanedPlaces);
                console.log('Adding', cleanedPlaces.length, 'place markers');
                cleanedPlaces.forEach((place) => {
                  const placeMarker = new google.maps.Marker({
                    position: place.location,
                    map: mapInstanceRef.current,
                    title: place.name,
                    icon: {
                      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                      fillColor: '#2563EB',
                      fillOpacity: 1,
                      strokeColor: '#1D4ED8',
                      strokeWeight: 1,
                      scale: 4
                    }
                  });
                  placeMarker.addListener('click', () => {
                    infoWindow.setContent(`
                      <div style="font-family: Arial, sans-serif; font-size: 14px;">
                        <strong>${place.name}</strong><br />
                        ${place.address}<br />
                        ${place.rating ? `⭐ ${place.rating}` : ''}
                      </div>
                    `);
                    infoWindow.open(mapInstanceRef.current, placeMarker);
                  });
                  placesMarkersRef.current.push(placeMarker);
                });
              } else {
                console.warn('Places API status:', status);
                if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  setPlacesError(`Places API error: ${status}. Make sure Places API is enabled in Google Cloud Console.`);
                }
                setPlacesResults([]);
              }
            }
          );
        } else {
          console.warn('Places API not available');
          setPlacesError('Places API not loaded. Check your internet connection and API key.');
          setPlacesResults([]);
        }
      })
      .catch(() => {
        setPlacesError('Failed to load Google Maps. Check your API key.');
      });
  }, [courts, selectedPlayers, sport, playerCount, user]);

  const stars = (rating) => {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };

  return (
    <div className="app-shell">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1>{playerCount === 0 ? 'Courts near you' : 'Courts near your group'}</h1>
        <p>{playerCount === 0 ? `Solo - ${sport}` : `${playerCount} players · ${availability}`}</p>
      </div>

      <div className="scroll-content">
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: 16, minHeight: 320, background: '#F3F4F6' }} ref={mapRef}>
          <div style={{
            position: 'absolute', left: 14, top: 14, zIndex: 2,
            background: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)', fontSize: 12, color: '#111',
            display: 'grid', gap: 4, width: 180
          }}>
            <div style={{ fontWeight: 700 }}>{mapReady ? 'Live court map' : 'Loading court map...'}</div>
            <div>{courts.length} courts shown</div>
            <div>{playerCount === 0 ? 'Solo map view' : `Group of ${playerCount}`}</div>
          </div>
          <div style={{
            position: 'absolute', right: 14, top: 14, zIndex: 2,
            display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px',
            background: 'rgba(255,255,255,0.95)', borderRadius: 16, fontSize: 12, color: '#111'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 9999, background: '#34D399', display: 'inline-block' }} /> You</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 9999, background: '#F59E0B', display: 'inline-block' }} /> Midpoint</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 9999, background: '#FBBF24', display: 'inline-block' }} /> Court</div>
          </div>
        </div>
        {!GOOGLE_MAPS_KEY && (
          <div style={{ color: '#B45309', fontSize: 13, marginBottom: 12 }}>
            Add your Google Maps API key to frontend/.env as VITE_GOOGLE_MAPS_KEY.
          </div>
        )}
        {placesError && (
          <div style={{ background: '#FBE7E7', color: '#B91C1C', padding: 12, borderRadius: 14, marginBottom: 12, fontSize: 13 }}>
            {placesError}
          </div>
        )}

        <div className="section-label">Suggested courts</div>

        {placesResults.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-label">Nearby courts from Google</div>
            {placesResults.map((place) => (
              <div key={place.placeId} style={{ background: 'var(--bg)', borderRadius: 16, padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15 }}>{place.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{place.address}</div>
                    <div style={{ fontSize: 13, color: 'var(--amber)', marginTop: 4 }}>{place.rating ? `${'★'.repeat(Math.round(place.rating))}${'☆'.repeat(5 - Math.round(place.rating))}` : 'No rating'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Google Places</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="loading"><div className="spinner"></div></div>}
        {error && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '12px 14px', borderRadius: 12, fontSize: 13 }}>{error}</div>}

        {!loading && courts.length === 0 && (
          <div className="empty-state">
            <span className="emoji">🏟️</span>
            <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>No courts found</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Run the seed script to add courts to your database.</p>
          </div>
        )}

        {courts.map((court, i) => (
          <div
            key={court._id}
            onClick={() => setSelected(court)}
            style={{
              background: 'var(--bg)', borderRadius: 16, padding: 14, marginBottom: 10,
              border: selected?._id === court._id ? '2px solid var(--green)' : '1px solid var(--border)',
              cursor: 'pointer', transition: '0.15s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15 }}>{court.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{court.address}</div>
                <div style={{ fontSize: 13, color: 'var(--amber)', marginTop: 4 }}>{stars(court.rating)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--green)' }}>
                  ₹{court.pricePerHour}/hr
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{court.totalCourts} courts</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {i === 0 && <span className="chip chip-green">{playerCount === 0 ? 'Closest to you' : 'Closest to group'}</span>}
              {playerCount > 0 && <span className="chip chip-amber">{court.distanceFromMidpoint} km from midpoint</span>}
              {court.sports?.map(s => <span key={s} className="chip" style={{ background: 'var(--bg2)', color: 'var(--text2)' }}>{s}</span>)}
            </div>
          </div>
        ))}

        {selected && (
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => navigate('/confirm', { state: { sport, playerCount, availability, selectedPlayers, court: selected } })}
          >
            Confirm — {selected.name} →
          </button>
        )}
      </div>

      <NavBar />
    </div>
  );
}
