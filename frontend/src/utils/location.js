const GOOGLE_MAPS_KEY = "AIzaSyCKLtOdSIEeFLM7o4l4W5GAk-_Z5boAO0s"
const GOOGLE_SCRIPT_ID = 'google-maps-script';

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_KEY) return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google);

  return new Promise((resolve) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true });
      existing.addEventListener('error', () => resolve(null), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

function formatFallbackAddress(lat, lng) {
  return lat && lng ? 'Current location' : 'Location selected';
}

function cleanAddressParts(parts) {
  return parts
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean);
}

export function formatPlaceLabel(place) {
  const name = place?.name || place?.structured_formatting?.main_text || '';
  const address = place?.formatted_address || place?.vicinity || place?.description || '';
  const parts = cleanAddressParts([name, address]);

  if (parts.length === 0) return 'Location selected';
  if (parts.length === 1) return parts[0];
  if (parts[1].toLowerCase().startsWith(parts[0].toLowerCase())) return parts[1];
  return `${parts[0]}, ${parts[1]}`;
}

function getNearbyPlaceLabel(google, lat, lng, fallbackAddress) {
  if (!google?.maps?.places?.PlacesService) return Promise.resolve('');

  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const location = new google.maps.LatLng(lat, lng);

    service.nearbySearch({ location, radius: 120 }, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
        resolve('');
        return;
      }

      const usefulTypes = [
        'establishment',
        'point_of_interest',
        'premise',
        'place_of_worship',
        'gym',
        'park',
        'school',
        'stadium'
      ];
      const ignoredTypes = ['locality', 'political', 'route'];
      const preferred = results.find((place) =>
        place.name &&
        place.types?.some((type) => usefulTypes.includes(type)) &&
        !place.types?.every((type) => ignoredTypes.includes(type))
      ) || results.find((place) => place.name);

      resolve(preferred ? formatPlaceLabel({ ...preferred, formatted_address: fallbackAddress }) : '');
    });
  });
}

export async function reverseGeocode(lat, lng) {
  const google = await loadGoogleMaps();
  if (!google?.maps?.Geocoder) return formatFallbackAddress(lat, lng);

  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        resolve(formatFallbackAddress(lat, lng));
        return;
      }

      const preferred = results.find((result) =>
        result.types?.some((type) =>
          ['premise', 'establishment', 'point_of_interest', 'sublocality', 'locality'].includes(type)
        )
      ) || results[0];

      const fallbackAddress = preferred.formatted_address || formatFallbackAddress(lat, lng);
      getNearbyPlaceLabel(google, lat, lng, fallbackAddress)
        .then((nearbyLabel) => resolve(nearbyLabel || fallbackAddress));
    });
  });
}

export function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    });
  });
}

export async function getCurrentLocationWithAddress() {
  const position = await getBrowserPosition();
  const { latitude, longitude } = position.coords;
  const address = await reverseGeocode(latitude, longitude);

  return {
    address,
    lat: latitude,
    lng: longitude
  };
}
