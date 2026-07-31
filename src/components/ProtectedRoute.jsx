import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          from: location.pathname,
          message: 'برای ادامه فرایند رزرو و پرداخت، ابتدا وارد حساب کاربری شوید.',
        }}
      />
    );
  }

  return <Outlet />;
}
