import React, { useEffect, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';

export default function App() {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {

    (async () => {

      // Demande la permission pour la position 
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          "Active la localisation dans les réglages pour voir ta position."
        );
        return;
      }

      // position recup
      const loc = await Location.getCurrentPositionAsync({});

      // centrer la carte dessus
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation          // point bleu de ta position
        showsMyLocationButton      // bouton de recentrage 
        initialRegion={{
          latitude: 43.4929,       // Bayonne par défaut 
          longitude: -1.4748,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});