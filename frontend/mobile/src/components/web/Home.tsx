import { Button, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';

export default function Home() {
	const router = useRouter();
	const { session, signOut } = useSession();

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Accueil</Text>
			<Button title="Voir la carte" onPress={() => router.push('/map')} />
			<Button title="Se déconnecter" onPress={signOut} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
	title: { fontSize: 24, fontWeight: 'bold' },
});