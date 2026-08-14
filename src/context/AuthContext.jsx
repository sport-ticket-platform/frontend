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

function readStoredUser() {
  const user = storage.get('user');
  const accessToken = storage.get('accessToken');

  if (!user || !accessToken) {
    storage.clearSession();
    return null;
  }

  return user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

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

  const requestOtp = useCallback((identifier) => (
    authService.requestOtp(identifier)
  ), []);

  const verifyOtp = useCallback(async (identifier, mfa, otp) => {
    const session = await authService.verifyOtp(identifier, mfa, otp);
    if (!session.requiresOtp) syncSession(session);
    return session;
  }, [syncSession]);

  const signupInitiate = useCallback((email) => (
    authService.signupInitiate(email)
  ), []);

  const signupVerify = useCallback((token, otp) => (
    authService.signupVerify(token, otp)
  ), []);

  const completeSignup = useCallback(async (values) => {
    const session = await authService.signupComplete(values);
    if (!session.requiresOtp) syncSession(session);
    return session;
  }, [syncSession]);

  const resetPasswordInitiate = useCallback((email) => (
    authService.resetPasswordInitiate(email)
  ), []);

  const resetPasswordVerify = useCallback((mfa, otp) => (
    authService.resetPasswordVerify(mfa, otp)
  ), []);

  const resetPasswordComplete = useCallback((tempToken, password) => (
    authService.resetPasswordComplete(tempToken, password)
  ), []);

  const updateUser = useCallback((updatedUser) => {
    storage.set('user', updatedUser);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user && storage.get('accessToken')),
    isSupport: ['SUPPORT', 'ADMIN'].includes(String(user?.role || '').toUpperCase()),
    isAdmin: String(user?.role || '').toUpperCase() === 'ADMIN',
    loginWithPassword,
    requestOtp,
    verifyOtp,
    signupInitiate,
    signupVerify,
    completeSignup,
    resetPasswordInitiate,
    resetPasswordVerify,
    resetPasswordComplete,
    updateUser,
    logout,
  }), [
    user,
    loginWithPassword,
    requestOtp,
    verifyOtp,
    signupInitiate,
    signupVerify,
    completeSignup,
    resetPasswordInitiate,
    resetPasswordVerify,
    resetPasswordComplete,
    updateUser,
    logout,
  ]);

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
