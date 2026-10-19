import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { getMyInfos, type MyInfos } from '../../services/api';

export default function Home() {
	const router = useRouter();
	const { session, signOut } = useSession();
	const [infos, setInfos] = useState<MyInfos | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!session?.token) return;

		let isCurrent = true;
		getMyInfos(session.token)
			.then((userInfos) => {
				if (isCurrent) setInfos(userInfos);
			})
			.catch((requestError: unknown) => {
				if (isCurrent) {
					setError(requestError instanceof Error ? requestError.message : 'Impossible de charger le profil.');
				}
			});

		return () => {
			isCurrent = false;
		};
	}, [session?.token]);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Accueil</Text>
			{error ? (
				<Text>{error}</Text>
			) : infos ? (
				<>
					<Text style={styles.title}>Bonjour {infos.user_name}</Text>
					<Text>Téléphone : {infos.user_tel}</Text>
					<Text>Position : {infos.lat ?? 'non renseignée'}, {infos.lng ?? 'non renseignée'}</Text>
					<Text>ICS : {infos.user_ics ?? 'non renseigné'}</Text>
				</>
			) : (
				<Text>Chargement du profil...</Text>
			)}
			<Button title="Voir la carte" onPress={() => router.push('/map')} />
			<Button title="Se déconnecter" onPress={signOut} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
	title: { fontSize: 24, fontWeight: 'bold' },
});