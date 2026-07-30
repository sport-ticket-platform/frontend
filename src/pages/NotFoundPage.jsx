import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="page-section">
      <div className="container simple-message">
        <h1>صفحه پیدا نشد</h1>
        <p>آدرسی که وارد کرده‌اید وجود ندارد.</p>
        <Link className="text-link" to="/">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </section>
  );
}
