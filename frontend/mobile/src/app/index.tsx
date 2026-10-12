import { FlatList, Text, View, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../ctx';

type Trip = { id: number; depart: string; arrivee: string; heureDep: string; moyen: string };

const TRIPS: Trip[] = [
  { id: 1, depart: 'Anglet', arrivee: 'Campus', heureDep: '08:00', moyen: 'Vélo' },
  { id: 2, depart: 'Bayonne', arrivee: 'Campus', heureDep: '08:15', moyen: 'Bus' },
];

export default function Home() {
  const router = useRouter();
  const { signOut } = useSession();

  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 60 }}>
      <FlatList
        data={TRIPS}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => (
          <Text style={{ paddingVertical: 8 }}>
            {item.depart} → {item.arrivee} · {item.heureDep} · {item.moyen}
          </Text>
        )}
      />
      <Button title="Voir la carte" onPress={() => router.push('/map')} />
      <Button title="Se déconnecter" onPress={signOut} />
    </View>
  );
}