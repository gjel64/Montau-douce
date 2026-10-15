import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSession } from '../../auth/SessionContext';
import { getPossibleRides, Ride } from '../../services/api';

export default function Map() {
  const mapRef = useRef<MapView>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const { session } = useSession();

  // Position de l'utilisateur
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Active la localisation dans les réglages pour voir ta position.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});

      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        1000
      );
    })();
  }, []);

  // Trajets depuis l'API
  useEffect(() => {
    if (!session?.token) return;

    let isCurrent = true;
    getPossibleRides(session.token)
      .then((loadedRides) => {
        if (isCurrent) setRides(loadedRides);
      })
      .catch((e) => console.warn('getPossibleRides a échoué :', e));

    return () => {
      isCurrent = false;
    };
  }, [session?.token]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton
        initialRegion={{
          latitude: 43.4929, // Bayonne par défaut
          longitude: -1.4748,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {rides.map((r) => {
          const path = [
            { latitude: r.lat_start, longitude: r.lng_start },
            ...r.stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
            { latitude: r.lat_end, longitude: r.lng_end },
          ];
          return (
            <React.Fragment key={r.ride_id}>
              <Marker coordinate={path[0]} title={`Départ de ${r.user_name}`} />
              <Marker
                coordinate={path[path.length - 1]}
                title="Arrivée"
                pinColor="green"
              />
              <Polyline coordinates={path} strokeWidth={3} strokeColor="#208AEF" />
            </React.Fragment>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});