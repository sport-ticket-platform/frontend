import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <div className="footer-about">
          <Logo />
          <p>
            سامانه رزرو و خرید بلیط مسابقات ورزشی.
          </p>
        </div>

        <nav className="footer-links" aria-label="پیوندهای پایین صفحه">
          <Link to="/">خانه</Link>
          <Link to="/tickets">بلیط‌ها</Link>
        </nav>
      </div>

    </footer>
  );
}
