import {
  ArrowLeft,
  CalendarSearch,
  Clock3,
  CreditCard,
  Search,
  ShieldCheck,
  TicketCheck,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const sports = [
  { value: 'football', label: 'فوتبال', symbol: '⚽'},
  { value: 'volleyball', label: 'والیبال', symbol: '🏐' },
  { value: 'basketball', label: 'بسکتبال', symbol: '🏀' },
];

const features = [
  {
    icon: CalendarSearch,
    title: 'جستجوی ساده مسابقات',
    description: 'مسابقات را بر اساس نوع ورزش، تیم، تاریخ و شهر پیدا کن.',
  },
  {
    icon: Clock3,
    title: 'رزرو موقت بلیط',
    description: 'بلیط انتخاب‌شده برای مدت محدود در اختیار کاربر قرار می‌گیرد.',
  },
  {
    icon: ShieldCheck,
    title: 'مدیریت امن خریدها',
    description: 'وضعیت رزرو، پرداخت، کنسلی و استرداد از حساب کاربری قابل پیگیری است.',
  },
];

export default function HomePage() {
  return (
  <>
    <section className="page-section">
      <div className="container intro-panel">
        <span className="page-label"> اسپورت تیکت </span>
        <h1>رزرو و خرید بلیط مسابقات ورزشی</h1>
        <p>
          این رابط کاربری برای جستجو، مشاهده و رزرو بلیط مسابقات ورزشی
          طراحی شده است.
        </p>
        <div className="home-actions">
            <Link className="primary-button" to="/tickets">
              <Search size={18} />
              مشاهده مسابقات
            </Link>
            <Link className="secondary-button" to="/auth">
              <UserRound size={18} />
              ورود و ثبت‌نام
            </Link>
        </div>
      </div>
    </section>
    <section className="home-section">
      <div className="container">
          <div className="section-title">
            <div>
              <span className="page-label">انتخاب سریع</span>
              <h2>رشته ورزشی موردنظر را انتخاب کن</h2>
            </div>
            <Link className="text-link inline-link" to="/tickets">
              همه مسابقات
              <ArrowLeft size={17} />
            </Link>
          </div>

          <div className="sport-list">
            {sports.map((sport) => (
              <Link
                className="sport-item"
                key={sport.value}
                to={`/tickets?sport=${sport.value}`}
              >
                <span className="sport-symbol" aria-hidden="true">
                  {sport.symbol}
                </span>
                <div>
                  <strong>{sport.label}</strong>
                  <small>مشاهده بلیط‌های موجود</small>
                </div>
                <ArrowLeft size={25} />
              </Link>
            ))}
          </div>
      </div>
    </section>
  </>
  );
}
