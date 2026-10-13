import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SessionProvider, useSession } from '../auth/SessionContext';
import { SplashScreenController } from '../auth/SplashScreenController';

function RootNavigation() {
  const { isLoading, session } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = segments[0] === 'sign-up' || segments[0] === 'sign-in';
    if (!session && !isPublicRoute) {
      router.replace('/sign-up');
    } else if (session && isPublicRoute) {
      router.replace('/');
    }
  }, [isLoading, router, segments, session]);

  return (
    <>
      <SplashScreenController />
      <Stack />
    </>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigation />
    </SessionProvider>
  );
}
