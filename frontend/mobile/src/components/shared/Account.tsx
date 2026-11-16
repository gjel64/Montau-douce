import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import {
  deleteMyAccount,
  getMyInfos,
  updateMyInfos,
} from '../../services/api';

export default function Account() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [hasProfile, setHasProfile] = useState(false);
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [ics, setIcs] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!session?.token) return;
    let active = true;

    getMyInfos(session.token)
      .then((profile) => {
        if (!active) return;
        setHasProfile(true);
        setName(profile.user_name);
        setTel(profile.user_tel);
        setLat(profile.lat == null ? '' : String(profile.lat));
        setLng(profile.lng == null ? '' : String(profile.lng));
        setIcs(profile.user_ics ?? '');
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : 'Impossible de charger le compte.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [session?.token]);

  async function saveAccount() {
    if (!session?.token) return;
    if (!name.trim() || !tel.trim()) {
      setMessage('Le nom et le téléphone sont obligatoires.');
      return;
    }

    const latitude = lat.trim() ? Number(lat) : undefined;
    const longitude = lng.trim() ? Number(lng) : undefined;
    if ((latitude === undefined) !== (longitude === undefined)) {
      setMessage('Renseignez les deux coordonnées ou laissez-les toutes les deux vides.');
      return;
    }
    if (
      (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
    ) {
      setMessage('Les coordonnées ne sont pas valides.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    try {
      await updateMyInfos(session.token, {
        user_name: name.trim(),
        user_tel: tel.trim(),
        user_ics: ics.trim(),
        ...(latitude !== undefined && longitude !== undefined ? { lat: latitude, lng: longitude } : {}),
      });
      setMessage('Modifications enregistrées.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible d’enregistrer les modifications.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAccount() {
    if (!session?.token) return;
    setIsDeleting(true);
    setMessage('');
    try {
      await deleteMyAccount(session.token);
      signOut();
      router.replace('/sign-in');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible de supprimer le compte.');
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  function disconnect() {
    signOut();
    router.replace('/sign-in');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Mon compte</Text>
        {isLoading ? <Text style={styles.message}>Chargement...</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {hasProfile ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Nom</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom" textAlign="center" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput style={styles.input} value={tel} onChangeText={setTel} placeholder="Téléphone" keyboardType="phone-pad" textAlign="center" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput style={styles.input} value={lat} onChangeText={setLat} placeholder="Latitude" keyboardType="decimal-pad" textAlign="center" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput style={styles.input} value={lng} onChangeText={setLng} placeholder="Longitude" keyboardType="decimal-pad" textAlign="center" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Calendrier ICS</Text>
              <TextInput style={styles.input} value={ics} onChangeText={setIcs} placeholder="Lien du calendrier" autoCapitalize="none" textAlign="center" />
            </View>
            <View style={styles.action}>
              <Button title={isSaving ? 'Enregistrement...' : 'Enregistrer'} onPress={saveAccount} disabled={isSaving} />
            </View>
            <View style={styles.action}>
              <Button title="Se déconnecter" onPress={disconnect} />
            </View>
            <Text style={styles.sectionTitle}>Suppression du compte</Text>
            {confirmDelete ? (
              <>
                <Text style={styles.message}>Cette action supprimera votre compte et les données associées. Elle est définitive.</Text>
                <View style={styles.action}>
                  <Button title={isDeleting ? 'Suppression...' : 'Confirmer la suppression'} onPress={deleteAccount} disabled={isDeleting} color="#b00020" />
                </View>
                <View style={styles.action}>
                  <Button title="Annuler" onPress={() => setConfirmDelete(false)} disabled={isDeleting} />
                </View>
              </>
            ) : (
              <View style={styles.action}>
                <Button title="Supprimer mon compte" onPress={() => setConfirmDelete(true)} color="#b00020" />
              </View>
            )}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
  },
  form: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  field: {
    width: '100%',
    gap: 6,
  },
  label: {
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  input: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  action: {
    width: '100%',
    marginTop: 4,
  },
  message: {
    textAlign: 'center',
  },
});