import { useState } from 'react';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
const navClassName = ({ isActive }) =>
  `nav-link${isActive ? ' active' : ''}`;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    closeMenu();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />

        <button
          className="menu-button"
          type="button"
          aria-label="باز کردن منوی سایت"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <nav
          className={`main-nav${menuOpen ? ' open' : ''}`}
          aria-label="منوی اصلی"
          onClick={closeMenu}
        >
          <NavLink className={navClassName} to="/" end>
            خانه
          </NavLink>
          <NavLink className={navClassName} to="/tickets">
            مسابقات و بلیط‌ها
          </NavLink>
        </nav>

        {isAuthenticated ? (
          <div className="signed-in-actions">
            <Link className="signed-in-user" to="/dashboard" onClick={closeMenu}>
              <UserRound size={17} />
              {user?.firstName || 'کاربر'} {user?.lastName || ''}
            </Link>
            <button className="logout-button" type="button" onClick={handleLogout}>
              <LogOut size={17} />
              خروج
            </button>
          </div>
        ) : (
          <Link className="login-link" to="/auth" onClick={closeMenu}>
            <UserRound size={18} />
            ورود / ثبت‌نام
          </Link>
        )}
      </div>
    </header>
  );
}
