import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, CircleAlert, MapPin, Send } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { ticketService } from '../services/ticketService.js';

const categories = [
  { value: 'payment', label: 'مشکل در پرداخت' },
  { value: 'ticket_info', label: 'اشتباه در اطلاعات بلیط' },
  { value: 'seat', label: 'مشکل در جایگاه یا صندلی' },
  { value: 'schedule', label: 'تغییر زمان مسابقه' },
  { value: 'unexpected_cancel', label: 'کنسلی غیرمنتظره' },
  { value: 'other', label: 'سایر موارد' },
];

export default function ReportIssuePage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [category, setCategory] = useState(categories[0].value);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedReport, setSubmittedReport] = useState(null);

  useEffect(() => {
    let active = true;

    ticketService.getBookingById(bookingId)
      .then((bookingData) => {
        if (!bookingData) throw new Error('رزرو موردنظر پیدا نشد.');
        if (active) setBooking(bookingData);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'اطلاعات رزرو دریافت نشد.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  const submitReport = async (event) => {
    event.preventDefault();
    setError('');

    if (description.trim().length < 10) {
      setError('توضیحات گزارش باید حداقل ۱۰ کاراکتر باشد.');
      return;
    }

    setSubmitting(true);
    try {
      const report = await ticketService.submitReport({
        bookingId,
        category,
        description: description.trim(),
      });
      setSubmittedReport(report);
    } catch (requestError) {
      setError(requestError.message || 'ثبت گزارش انجام نشد.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading label="در حال دریافت اطلاعات رزرو..." />;

  if (submittedReport) {
    return (
      <section className="container action-result-page">
        <div className="action-result-card">
          <Send size={46} />
          <h1>گزارش شما ثبت شد</h1>
          <p>گزارش با شناسه زیر در انتظار بررسی پشتیبان قرار گرفته است.</p>
          <strong className="report-code">{submittedReport.id}</strong>
          <Link className="primary-button" to="/dashboard">مشاهده گزارش‌های من</Link>
        </div>
      </section>
    );
  }

  if (!booking) {
    return (
      <section className="container simple-error-page">
        <CircleAlert size={42} />
        <h1>رزرو پیدا نشد</h1>
        <p>{error || 'اطلاعات رزرو در دسترس نیست.'}</p>
        <Link className="primary-button" to="/dashboard">بازگشت به حساب کاربری</Link>
      </section>
    );
  }

  const ticket = booking.ticket || {};

  return (
    <section className="container request-page">
      <Link className="request-back-link" to="/dashboard">
        <ArrowRight size={17} />
        بازگشت به حساب کاربری
      </Link>

      <div className="request-layout">
        <main className="request-form-card">
          <div className="request-title">
            <CircleAlert size={25} />
            <div>
              <h1>گزارش مشکل بلیط</h1>
              <p>موضوع مشکل و توضیحات لازم را برای پشتیبان ثبت کنید.</p>
            </div>
          </div>

          {error && <div className="form-message error">{error}</div>}

          <form onSubmit={submitReport}>
            <label className="request-field">
              موضوع گزارش
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="request-field">
              توضیحات مشکل
              <textarea
                rows="7"
                maxLength="480"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="مشکل مشاهده‌شده را با جزئیات توضیح دهید..."
              />
              <small>{description.length} از ۴۸۰ کاراکتر</small>
            </label>

            <button className="primary-button full-width-button" type="submit" disabled={submitting}>
              {submitting ? 'در حال ثبت گزارش...' : 'ثبت گزارش برای پشتیبان'}
            </button>
          </form>
        </main>

        <aside className="request-summary-card">
          <span className="request-summary-label">بلیط مربوط به گزارش</span>
          <h2>{ticket.homeTeam} - {ticket.awayTeam}</h2>
          <p><CalendarDays size={16} /> {ticket.date}، ساعت {ticket.time}</p>
          <p><MapPin size={16} /> {ticket.venue}</p>
          <div className="request-summary-lines">
            <div><span>شناسه رزرو</span><strong>{booking.id}</strong></div>
            <div><span>وضعیت</span><strong>{booking.statusLabel || 'پرداخت‌شده'}</strong></div>
            <div><span>تعداد بلیط</span><strong>{booking.quantity || 1}</strong></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
