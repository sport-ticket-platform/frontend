import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { authService } from '../services/authService.js';
import { storage } from '../services/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.get('user'));

  const syncSession = useCallback((session) => {
    if (session?.user) {
      storage.set('user', session.user);
      setUser(session.user);
    }
    return session;
  }, []);

  const loginWithPassword = useCallback(async (identifier, password) => {
    const session = await authService.loginWithPassword(identifier, password);
    if (!session.requiresOtp) syncSession(session);
    return session;
  }, [syncSession]);

  const verifyOtp = useCallback(async (identifier, mfa, otp) => {
    const session = await authService.verifyOtp(identifier, mfa, otp);
    return syncSession(session);
  }, [syncSession]);

  const completeSignup = useCallback(async (values) => {
    const session = await authService.signupComplete(values);
    return syncSession(session);
  }, [syncSession]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user && storage.get('accessToken')),
    isSupport: ['SUPPORT', 'ADMIN'].includes(String(user?.role || '').toUpperCase()),
    loginWithPassword,
    requestOtp: authService.requestOtp,
    verifyOtp,
    signupInitiate: authService.signupInitiate,
    signupVerify: authService.signupVerify,
    completeSignup,
    logout,
  }), [user, loginWithPassword, verifyOtp, completeSignup, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
