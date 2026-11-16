import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useSession } from '../../auth/SessionContext';
import { createUser } from '../../services/api';

export default function SignUp() {
  const { signIn } = useSession();
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [passwd, setPasswd] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    if (!name.trim() || !tel.trim() || !passwd) {
      setMessage('Remplis ton nom, ton téléphone et ton mot de passe.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      signIn(await createUser({ name: name.trim(), tel: tel.trim(), passwd }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Nom" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Téléphone" keyboardType="phone-pad" value={tel} onChangeText={setTel} />
      <TextInput style={styles.input} placeholder="Mot de passe" secureTextEntry value={passwd} onChangeText={setPasswd} />
      {message ? <Text>{message}</Text> : null}
      <Button title={isSubmitting ? 'Création...' : 'Créer mon compte'} onPress={onSubmit} disabled={isSubmitting} />
      <Link href="/sign-in" style={styles.link}>J’ai déjà un compte : me connecter</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  link: { color: '#1769aa', textAlign: 'center', padding: 8 },
});