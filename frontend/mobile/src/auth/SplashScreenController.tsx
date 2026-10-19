// ÉCRAN DE DÉMARRAGE : garde le logo de l'appli affiché tant qu'on lit la session sauvegardée
// Ne fait rien sur le web

import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { useSession } from './SessionContext';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync(); //empêche l'écran de démarrage de disparaître tout seul
}

export function SplashScreenController() {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && Platform.OS !== 'web') {
      SplashScreen.hide();
    }
  }, [isLoading]);

  return null;
}