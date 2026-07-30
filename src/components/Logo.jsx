import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link className="brand" to="/" aria-label="اسپورتیک - صفحه اصلی">
      <span className="brand-mark" aria-hidden="true">Sport</span>
      <span className="brand-copy">
        <strong>اسپورتیک</strong>
        <small>بلیط مسابقات ورزشی</small>
      </span>
    </Link>
  );
}
