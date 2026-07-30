import { useState } from 'react';
import { Menu, UserRound, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';

const navClassName = ({ isActive }) =>
  `nav-link${isActive ? ' active' : ''}`;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

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

        <Link className="login-link" to="/auth" onClick={closeMenu}>
          <UserRound size={18} />
          ورود / ثبت‌نام
        </Link>
      </div>
    </header>
  );
}
