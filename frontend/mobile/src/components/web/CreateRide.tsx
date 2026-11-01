import { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { createRide } from '../../services/api'; 

export default function CreateRide() {
    const router = useRouter();
    const { session } = useSession();

    const [type, setType] = useState('voiture');
    const [rideStart, setRideStart] = useState('');
    const [rideGoalTime, setRideGoalTime] = useState('');
    const [latStart, setLatStart] = useState('');
    const [lngStart, setLngStart] = useState('');
    const [latEnd, setLatEnd] = useState('');
    const [lngEnd, setLngEnd] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function onSubmit() {
        if (!session?.token) {
            Alert.alert('Erreur', 'Tu dois être connecté pour publier un trajet.');
            return;
        }

        if (!type || !rideStart || !rideGoalTime || !latStart || !lngStart || !latEnd || !lngEnd) {
            Alert.alert('Champs manquants', 'Merci de remplir toutes les informations du trajet.');
            return;
        }

        setIsSubmitting(true);
        try {
            await createRide(session.token, {
                type,
                ride_start: rideStart,
                ride_goal_time: rideGoalTime,
                lat_start: Number(latStart),
                lng_start: Number(lngStart),
                lat_end: Number(latEnd),
                lng_end: Number(lngEnd),
            });
            
            Alert.alert('Succès', 'Ton trajet a bien été publié !');
            router.push('/');
            
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            Alert.alert('Impossible de publier le trajet', message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Publier un trajet</Text>
            
            <View style={styles.card}>
                <Text style={styles.subtitle}>Moyen de transport</Text>
                
                <View style={styles.typeContainer}>
                    {['voiture', 'vélo', 'bus'].map((transport) => (
                        <TouchableOpacity 
                            key={transport}
                            style={[styles.typeButton, type === transport && styles.typeButtonActive]}
                            onPress={() => setType(transport)}
                        >
                            <Text style={[styles.typeText, type === transport && styles.typeTextActive]}>
                                {transport.charAt(0).toUpperCase() + transport.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.subtitle}>Horaires</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Heure de départ (ex: 18:00)" 
                    value={rideStart} 
                    onChangeText={setRideStart} 
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Heure d'arrivée prévue (ex: 18:45)" 
                    value={rideGoalTime} 
                    onChangeText={setRideGoalTime} 
                />
                
                <Text style={styles.subtitle}>Point de départ</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Latitude départ (ex: 43.49)" 
                    keyboardType="numeric"
                    value={latStart} 
                    onChangeText={setLatStart} 
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Longitude départ (ex: -1.47)" 
                    keyboardType="numeric"
                    value={lngStart} 
                    onChangeText={setLngStart} 
                />

                <Text style={styles.subtitle}>Point d'arrivée</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Latitude arrivée" 
                    keyboardType="numeric"
                    value={latEnd} 
                    onChangeText={setLatEnd} 
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Longitude arrivée" 
                    keyboardType="numeric"
                    value={lngEnd} 
                    onChangeText={setLngEnd} 
                />
            </View>

            <Button 
                title={isSubmitting ? 'Publication en cours...' : 'Publier le trajet'} 
                onPress={onSubmit} 
                disabled={isSubmitting} 
            />
            
            <Link href="/" style={styles.cancelLink}>
                Annuler
            </Link>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 8 },
    card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 16, gap: 12, backgroundColor: '#f9f9f9' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: '#fff' },
    typeContainer: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    typeButton: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
    typeButtonActive: { backgroundColor: '#1769aa', borderColor: '#1769aa' },
    typeText: { color: '#333', fontSize: 16 },
    typeTextActive: { color: '#fff', fontWeight: 'bold' },
    cancelLink: { color: '#d32f2f', textAlign: 'center', padding: 8, fontWeight: 'bold', marginTop: 10 }
});