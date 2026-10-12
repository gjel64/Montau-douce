import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { useSession } from '@/ctx';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

export function SplashScreenController() {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && Platform.OS !== 'web') SplashScreen.hide();
  }, [isLoading]);

  return null;
}
