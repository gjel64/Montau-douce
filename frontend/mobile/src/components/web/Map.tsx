import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { DEV_TOKEN, getRides, Ride } from '../../services/api';

// Fix de l'icône de marqueur par défaut de Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_POSITION: [number, number] = [43.4929, -1.4748]; // Bayonne

// Recentre la carte quand la position change
function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, 14);
  }, [position, map]);
  return null;
}

export default function Map() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);

  // Géolocalisation du navigateur
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('Géolocalisation refusée :', err.message)
    );
  }, []);

  // Trajets depuis l'API
  useEffect(() => {
    getRides(DEV_TOKEN)
      .then(setRides)
      .catch((e) => console.warn('getRides a échoué :', e));
  }, []);

  return (
    <>
      {/* Le CSS de Leaflet est obligatoire */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <MapContainer
        center={position ?? DEFAULT_POSITION}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {position && (
          <>
            <Marker position={position} icon={icon}>
              <Popup>Tu es ici</Popup>
            </Marker>
            <Recenter position={position} />
          </>
        )}

        {rides.map((r) => {
          const path: [number, number][] = [
            [r.lat_start, r.lng_start],
            ...r.stops.map((s): [number, number] => [s.lat, s.lng]),
            [r.lat_end, r.lng_end],
          ];
          return (
            <React.Fragment key={r.ride_id}>
              <Marker position={path[0]} icon={icon}>
                <Popup>Départ de {r.user_name}</Popup>
              </Marker>
              <Marker position={path[path.length - 1]} icon={icon}>
                <Popup>Arrivée</Popup>
              </Marker>
              <Polyline positions={path} />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </>
  );
}