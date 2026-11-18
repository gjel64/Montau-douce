import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { ApiError, getMyInfos, type MyInfos } from '../../services/api';

export default function Home() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [infos, setInfos] = useState<MyInfos | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.token) return;
    let active = true;

    getMyInfos(session.token)
      .then((profile) => {
        if (active) setInfos(profile);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          signOut();
          router.replace('/sign-in');
          return;
        }
        setError(requestError instanceof Error ? requestError.message : 'Impossible de charger le profil.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [router, session?.token, signOut]);

  return (
    <View style={styles.page}>
      <View style={styles.content}>
        <Text style={styles.title}>Montau’Douce</Text>
        <View style={styles.rule} />
        {isLoading ? <ActivityIndicator color="#17473E" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!isLoading && !error ? (
          <>
            <Text style={styles.greeting}>Bonjour{infos?.user_name ? `, ${infos.user_name}` : ''}</Text>
            <Text style={styles.description}>La mobilité partagée, tout simplement.</Text>
          </>
        ) : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/map')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Voir la carte</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/search-ride')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Rechercher un trajet</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/account')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Mon compte</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#F5F6F1' },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center', gap: 18 },
  title: { color: '#17473E', fontSize: 32, fontWeight: '700', textAlign: 'center' },
  rule: { width: 52, height: 3, backgroundColor: '#C45C3C' },
  greeting: { color: '#1D302C', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  description: { color: '#64736D', fontSize: 15, textAlign: 'center' },
  error: { color: '#A33D36', textAlign: 'center' },
  actions: { width: '100%', gap: 10, marginTop: 8 },
  primaryButton: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 6, backgroundColor: '#17473E', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#17473E', borderRadius: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 16 },
  secondaryButtonText: { color: '#17473E', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});