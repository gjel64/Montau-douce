import { createContext, use, type PropsWithChildren } from 'react';
import { useStorageState } from '../hooks/useStorageState';

export type Session = { token: string; expires_at: string };

type SessionContextValue = {
  signIn: (session: Session) => void;
  signOut: () => void;
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) throw new Error('useSession doit être dans <SessionProvider />');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, rawSession], setRawSession] = useStorageState('session');
  const session: Session | null = rawSession ? JSON.parse(rawSession) : null;

  return (
    <AuthContext.Provider
      value={{
        signIn: (value) => setRawSession(JSON.stringify(value)),
        signOut: () => setRawSession(null),
        session,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}