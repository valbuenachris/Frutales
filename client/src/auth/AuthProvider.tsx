import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { AUTH_UNAUTHORIZED_EVENT } from '../api/client';
import type { LoginInput, User } from '../types/auth';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

interface AuthContextValue {
  user: User | null;
  /** true mientras se resuelve la sesión inicial (GET /auth/me). */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Provider de sesión: consulta /auth/me y centraliza login/logout. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  /** Limpia cualquier dato cacheado de la sesión anterior. */
  const resetCache = useCallback(() => {
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    });
  }, [queryClient]);

  // Cuando una llamada cualquiera responde 401, la sesión dejó de ser válida.
  useEffect(() => {
    const handleUnauthorized = () => {
      resetCache();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [queryClient, resetCache]);

  const login = useCallback(
    async (input: LoginInput): Promise<User> => {
      const user = await authApi.login(input);
      resetCache();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      return user;
    },
    [queryClient, resetCache],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      // OJO: no usar queryClient.clear() aquí — elimina también la query de
      // auth y el observer montado de useQuery queda desconectado, dejando el
      // usuario viejo visible. resetCache() limpia todo EXCEPTO auth y el
      // setQueryData(null) actualiza el observer vivo (dispara el redirect).
      resetCache();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
    }
  }, [queryClient, resetCache]);

  const user = meQuery.data ?? null;

  return (
    <AuthContext.Provider value={{ user, isLoading: meQuery.isPending, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
