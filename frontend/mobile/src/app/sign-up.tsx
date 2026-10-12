// src/app/sign-up.tsx
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { createUser } from '../api';
import { useSession } from '../ctx';

export default function SignUp() {
  const { signIn } = useSession();
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [passwd, setPasswd] = useState('');

  async function onSubmit() {
    try {
      const session = await createUser({ name, tel, passwd });
      signIn(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur de création du compte', message);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Nom" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Téléphone" keyboardType="phone-pad" value={tel} onChangeText={setTel} />
      <TextInput style={styles.input} placeholder="Mot de passe" secureTextEntry value={passwd} onChangeText={setPasswd} />
      <Button title="Créer mon compte" onPress={onSubmit} />
      <Link href="/sign-in" style={styles.link}>J’ai déjà un compte : me connecter</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  link: { color: '#1769aa', textAlign: 'center', padding: 8 },
});