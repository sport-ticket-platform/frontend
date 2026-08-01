import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarDays, MapPin, RotateCcw } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { ticketService } from '../services/ticketService.js';

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value || 0);

const reasons = [
  'تغییر برنامه شخصی',
  'ثبت اشتباه تعداد یا جایگاه',
  'تغییر زمان مسابقه',
  'مشکل در اطلاعات بلیط',
  'سایر موارد',
];

export default function CancellationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [penalty, setPenalty] = useState(null);
  const [reason, setReason] = useState(reasons[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      ticketService.getBookingById(bookingId),
      ticketService.getCancellationPenalty(bookingId),
    ])
      .then(([bookingData, penaltyData]) => {
        if (!active) return;
        if (!bookingData) throw new Error('رزرو موردنظر پیدا نشد.');
        setBooking(bookingData);
        setPenalty(penaltyData);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'اطلاعات کنسلی دریافت نشد.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  const submitCancellation = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const cancelled = await ticketService.cancelBooking(bookingId, reason);
      setResult(cancelled);
    } catch (requestError) {
      setError(requestError.message || 'کنسلی بلیط انجام نشد.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading label="در حال محاسبه جریمه کنسلی..." />;

  if (result) {
    return (
      <section className="container action-result-page">
        <div className="action-result-card">
          <RotateCcw size={46} />
          <h1>بلیط با موفقیت کنسل شد</h1>
          <p>مبلغ قابل استرداد در نسخه آزمایشی به کیف پول کاربر اضافه می‌شود.</p>
          <div className="refund-result">
            <span>جریمه کنسلی</span>
            <strong>{formatNumber(result.penaltyAmount)} تومان</strong>
            <span>مبلغ استرداد</span>
            <strong>{formatNumber(result.refundAmount)} تومان</strong>
          </div>
          <Link className="primary-button" to="/dashboard">بازگشت به حساب کاربری</Link>
        </div>
      </section>
    );
  }

  if (!booking || !penalty) {
    return (
      <section className="container simple-error-page">
        <AlertTriangle size={42} />
        <h1>امکان نمایش کنسلی وجود ندارد</h1>
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
            <RotateCcw size={25} />
            <div>
              <h1>کنسلی بلیط و استرداد وجه</h1>
              <p>قبل از تأیید، مبلغ جریمه و استرداد را بررسی کنید.</p>
            </div>
          </div>

          {error && <div className="form-message error">{error}</div>}

          <form onSubmit={submitCancellation}>
            <label className="request-field">
              دلیل کنسلی
              <select value={reason} onChange={(event) => setReason(event.target.value)}>
                {reasons.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <div className="cancellation-warning">
              <AlertTriangle size={20} />
              <p>پس از تأیید، وضعیت بلیط به «کنسل‌شده» تغییر می‌کند و امکان بازگرداندن آن وجود ندارد.</p>
            </div>

            <button className="danger-button full-width-button" type="submit" disabled={submitting || !penalty.canCancel}>
              {submitting ? 'در حال ثبت کنسلی...' : 'تأیید کنسلی بلیط'}
            </button>
          </form>
        </main>

        <aside className="request-summary-card">
          <span className="request-summary-label">اطلاعات رزرو</span>
          <h2>{ticket.homeTeam} - {ticket.awayTeam}</h2>
          <p><CalendarDays size={16} /> {ticket.date}، ساعت {ticket.time}</p>
          <p><MapPin size={16} /> {ticket.venue}</p>

          <div className="request-summary-lines">
            <div><span>مبلغ پرداختی</span><strong>{formatNumber(booking.amount)} تومان</strong></div>
            <div><span>درصد جریمه</span><strong>{formatNumber(penalty.penaltyPercent)}٪</strong></div>
            <div><span>مبلغ جریمه</span><strong>{formatNumber(penalty.penaltyAmount)} تومان</strong></div>
            <div className="refund-line"><span>مبلغ استرداد</span><strong>{formatNumber(penalty.refundAmount)} تومان</strong></div>
          </div>

          <small>{penalty.ruleLabel}</small>
          {!penalty.canCancel && <div className="form-message error">در این زمان امکان کنسلی بلیط وجود ندارد.</div>}
        </aside>
      </div>
    </section>
  );
}
