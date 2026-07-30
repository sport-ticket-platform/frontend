import { Link } from 'react-router-dom';

export default function PlaceholderPage({ title, description }) {
  return (
    <section className="page-section">
      <div className="container simple-message">
        <span className="page-label"> اسپورت تیکت </span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link className="text-link" to="/">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </section>
  );
}
