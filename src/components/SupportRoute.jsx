import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function SupportRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          from: location.pathname,
          message: 'برای مشاهده پنل پشتیبانی ابتدا وارد حساب پشتیبان شوید.',
        }}
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
