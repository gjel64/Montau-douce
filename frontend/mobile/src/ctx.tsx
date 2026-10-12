// src/ctx.tsx
import { use, createContext, type PropsWithChildren } from 'react';
import { useStorageState } from '@/useStorageState';

type Session = { token: string; expires_at: string };

const AuthContext = createContext<{
  signIn: (s: Session) => void;
  signOut: () => void;
  session: Session | null;
  isLoading: boolean;
} | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) throw new Error('useSession doit être dans <SessionProvider />');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, raw], setRaw] = useStorageState('session');
  const session: Session | null = raw ? JSON.parse(raw) : null;

  return (
    <AuthContext.Provider
      value={{
        signIn: (s) => setRaw(JSON.stringify(s)),
        signOut: () => setRaw(null),
        session,
        isLoading,
      }}>
      {children}
    </AuthContext.Provider>
  );
}