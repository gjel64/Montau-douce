import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { getRideInfos, RideInfos } from '../../services/api';

export default function SummaryRide() {
    const { rideId } = useLocalSearchParams();
    const { session } = useSession();

    const [rideData, setRideData] = useState<RideInfos | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchRideData() {
            if (!rideId || !session?.token) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const data = await getRideInfos(session.token, Number(rideId));
                setRideData(data);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erreur inconnue';
                Alert.alert('Impossible de récupérer le trajet', message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchRideData();
    }, [rideId, session?.token]);

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1769aa" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Récapitulatif de la course</Text>
            
            <View style={styles.card}>
                <Text style={styles.text}>N° de course : {rideData?.ride_id || '...'}</Text>
                <Text style={styles.text}>Type de trajet : {rideData?.type || '...'}</Text>
                <Text style={styles.text}>Départ prévu : {rideData?.ride_start || '...'}</Text>
                <Text style={styles.text}>Durée estimée : {rideData?.ride_goal_time || '...'}</Text>
                <Text style={styles.text}>Départ : Lat {rideData?.lat_start || '...'}, Lng {rideData?.lng_start || '...'}</Text>
                <Text style={styles.text}>Arrivée : Lat {rideData?.lat_end || '...'}, Lng {rideData?.lng_end || '...'}</Text>
                <Text style={styles.text}>Nombre d'arrêts : {rideData?.stops?.length || 0}</Text>
            </View>

            
            <Link href="/" style={styles.link}>
                Retour à l'accueil
            </Link>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 16, gap: 8, backgroundColor: '#f9f9f9' },
    text: { fontSize: 16, color: '#333' },
    link: { color: '#1769aa', textAlign: 'center', padding: 8, fontWeight: 'bold', marginTop: 10 },
});