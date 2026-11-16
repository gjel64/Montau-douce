import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { getRideInfos, type RideInfos } from '../../services/api';

export default function SummaryRide() {
  const router = useRouter();
  const { rideId } = useLocalSearchParams();
  const { session } = useSession();
  const [ride, setRide] = useState<RideInfos | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRide() {
      if (!rideId || !session?.token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const rideInfo = await getRideInfos(session.token, Number(rideId));
        if (active) setRide(rideInfo);
      } catch (error) {
        Alert.alert('Impossible de récupérer le trajet', error instanceof Error ? error.message : 'Erreur inconnue');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadRide();
    return () => { active = false; };
  }, [rideId, session?.token]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1769aa" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Récapitulatif de la course</Text>
      <View style={styles.details}>
        <Text style={styles.text}>N° de course : {ride?.ride_id ?? '...'}</Text>
        <Text style={styles.text}>Type de trajet : {ride?.type ?? '...'}</Text>
        <Text style={styles.text}>Départ prévu : {ride?.ride_start ?? '...'}</Text>
        <Text style={styles.text}>Durée estimée : {ride?.ride_goal_time ?? '...'}</Text>
        <Text style={styles.text}>Départ : Lat {ride?.lat_start ?? '...'}, Lng {ride?.lng_start ?? '...'}</Text>
        <Text style={styles.text}>Arrivée : Lat {ride?.lat_end ?? '...'}, Lng {ride?.lng_end ?? '...'}</Text>
        <Text style={styles.text}>Nombre d'arrêts : {ride?.stops.length ?? 0}</Text>
      </View>
      <Button title="Retour à l'accueil" onPress={() => router.push('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  details: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 16, gap: 8, backgroundColor: '#f9f9f9' },
  text: { fontSize: 16, color: '#333' },
});