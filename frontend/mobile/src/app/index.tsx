import { Text, View, StyleSheet, Button } from "react-native";
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Accueil</Text>

      <Button title="Aller aux détails" onPress={() => router.push('/map')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
