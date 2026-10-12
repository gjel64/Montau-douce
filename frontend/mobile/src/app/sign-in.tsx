import { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { loginUser } from '../api';
import { useSession } from '../ctx';

export default function SignIn() {
  const { signIn } = useSession();
  const [tel, setTel] = useState('');
  const [passwd, setPasswd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    if (!tel.trim() || !passwd) {
      Alert.alert('Champs manquants', 'Saisis ton téléphone et ton mot de passe.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await loginUser({ tel: tel.trim(), passwd });
      signIn(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Connexion impossible', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Téléphone"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={tel}
        onChangeText={setTel}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        autoComplete="password"
        value={passwd}
        onChangeText={setPasswd}
      />
      <Button title={isSubmitting ? 'Connexion…' : 'Se connecter'} onPress={onSubmit} disabled={isSubmitting} />
      <Link href="/sign-up" style={styles.link}>Pas encore de compte ? Créer un compte</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  link: { color: '#1769aa', textAlign: 'center', padding: 8 },
});