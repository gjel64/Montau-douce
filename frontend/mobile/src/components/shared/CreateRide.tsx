import { useState } from 'react';
import { Alert, Button, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { createRide } from '../../services/api';

const TRANSPORT_TYPES = [
    { id: 0, label: 'Voiture' },
    { id: 1, label: 'Vélo' },
    { id: 2, label: 'Bus' },
    { id: 3, label: 'À pied' },
];

function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${message}`);
    } else {
        Alert.alert(title, message);
    }
}

function toUtcIsoString(input: string): string | null {
    const trimmed = input.trim();

    // Accepte "18:00" ou "18h00" et le convertit à la date du jour en UTC
    const timeMatch = trimmed.match(/^(\d{1,2})[:hH](\d{2})$/);
    if (timeMatch) {
        const hours = Number(timeMatch[1]);
        const minutes = Number(timeMatch[2]);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const now = new Date();
            now.setHours(hours, minutes, 0, 0);
            return now.toISOString();
        }
        return null;
    }

    // Sinon vérifie si l'utilisateur a déjà tapé une date ISO valide
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
    }

    return null;
}

export default function CreateRide() {
    const router = useRouter();
    const { session } = useSession();

    const [type, setType] = useState<number>(0);
    const [nSeats, setNSeats] = useState('1');
    const [rideStart, setRideStart] = useState('');
    const [rideGoalTime, setRideGoalTime] = useState('');
    const [latStart, setLatStart] = useState('');
    const [lngStart, setLngStart] = useState('');
    const [latEnd, setLatEnd] = useState('');
    const [lngEnd, setLngEnd] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function onSubmit() {
        if (!session?.token) {
            showAlert('Erreur', 'Tu dois être connecté pour publier un trajet.');
            return;
        }

        if (!rideStart || !rideGoalTime || !latStart || !lngStart || !latEnd || !lngEnd) {
            showAlert('Champs manquants', 'Merci de remplir toutes les informations du trajet.');
            return;
        }

        const parsedSeats = type === 0 ? Math.floor(Number(nSeats)) : 1;
        if (Number.isNaN(parsedSeats) || parsedSeats < 1) {
            showAlert('Nombre de places invalide', 'Merci d\'indiquer au moins 1 place.');
            return;
        }

        const rideStartIso = toUtcIsoString(rideStart);
        const rideGoalTimeIso = toUtcIsoString(rideGoalTime);
        if (!rideStartIso || !rideGoalTimeIso) {
            showAlert('Horaire invalide', 'Utilise le format HH:MM (ex: 18:00) ou une date ISO.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await createRide(session.token, {
                type,
                n_seats: parsedSeats,
                ride_start: rideStartIso,
                ride_goal_time: rideGoalTimeIso,
                lat_start: Number(latStart),
                lng_start: Number(lngStart),
                lat_end: Number(latEnd),
                lng_end: Number(lngEnd),
            });

            showAlert('Succès', `Ton trajet #${response.ride_id} a bien été publié !`);
            router.push('/');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            showAlert('Impossible de publier le trajet', message);
        } finally {
            setIsSubmitting(false);
        }
    }

    function onCancel() {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.push('/');
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Publier un trajet</Text>

            <View style={styles.card}>
                <Text style={styles.subtitle}>Moyen de transport</Text>

                <View style={styles.typeContainer}>
                    {TRANSPORT_TYPES.map((transport) => (
                        <TouchableOpacity
                            key={transport.id}
                            style={[styles.typeButton, type === transport.id && styles.typeButtonActive]}
                            onPress={() => setType(transport.id)}
                        >
                            <Text style={[styles.typeText, type === transport.id && styles.typeTextActive]}>
                                {transport.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {type === 0 && (
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre de places disponibles (ex: 3)"
                        keyboardType="numeric"
                        value={nSeats}
                        onChangeText={setNSeats}
                    />
                )}

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
                    placeholder="Latitude arrivée (ex: 43.51)"
                    keyboardType="numeric"
                    value={latEnd}
                    onChangeText={setLatEnd}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Longitude arrivée (ex: -1.67)"
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

            <Button
                title="Annuler"
                color="#d32f2f"
                onPress={onCancel}
            />
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
    typeTextActive: { color: '#fff', fontWeight: 'bold' }
});