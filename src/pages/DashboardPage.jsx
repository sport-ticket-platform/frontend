import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CircleAlert,
  CreditCard,
  Flag,
  MapPin,
  PencilLine,
  ReceiptText,
  RotateCcw,
  TicketCheck,
  UserRound,
} from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ticketService } from '../services/ticketService.js';
import { userService } from '../services/userService.js';

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value || 0);

const paymentMethodLabels = {
  bank_card: 'کارت بانکی',
  wallet: 'کیف پول',
  local_gateway: 'درگاه محلی',
};

const reportCategoryLabels = {
  payment: 'مشکل در پرداخت',
  ticket_info: 'اشتباه در اطلاعات بلیط',
  seat: 'مشکل در جایگاه یا صندلی',
  schedule: 'تغییر زمان مسابقه',
  unexpected_cancel: 'کنسلی غیرمنتظره',
  other: 'سایر موارد',
};

function formatDate(value) {
  if (!value) return 'ثبت نشده';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(user || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      ticketService.getBookings(),
      ticketService.getReports(),
      userService.getProfile().catch(() => user),
    ])
      .then(([items, reportItems, fetchedProfile]) => {
        if (!active) return;
        setBookings(Array.isArray(items) ? items : []);
        setReports(Array.isArray(reportItems) ? reportItems : []);
        if (fetchedProfile) setProfile({ ...user, ...fetchedProfile });
      })
      .catch((error) => {
        if (active) setMessage({ type: 'error', text: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const stats = useMemo(() => ({
    count: bookings.length,
    tickets: bookings.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    total: bookings.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }), [bookings]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updated = await userService.updateProfile({
        userId: profile.userId,
        firstName: profile.firstName?.trim(),
        lastName: profile.lastName?.trim(),
        email: profile.email?.trim(),
        phoneNumber: profile.phoneNumber?.trim(),
        city: profile.city?.trim(),
      });
      const completeProfile = {
        ...updated,
        role: user?.role || updated.role || 'USER',
      };
      updateUser(completeProfile);
      setProfile(completeProfile);
      setMessage({ type: 'info', text: 'اطلاعات حساب با موفقیت ذخیره شد.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'ذخیره اطلاعات انجام نشد.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="در حال آماده‌سازی حساب کاربری..." />;

  return (
    <div className="dashboard-page">
      <section className="dashboard-header-section">
        <div className="container dashboard-heading">
          <div className="dashboard-avatar">
            {(profile.firstName || 'ک').charAt(0)}
          </div>
          <div>
            <span>حساب کاربری</span>
            <h1>{profile.firstName || 'کاربر'} {profile.lastName || ''}</h1>
            <p>{profile.email || profile.phoneNumber || 'اطلاعات تماس ثبت نشده است.'}</p>
          </div>
        </div>
      </section>

      <section className="container dashboard-layout">
        <aside className="dashboard-menu">
          <button
            className={activeTab === 'bookings' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('bookings')}
          >
            <TicketCheck size={18} />
            خریدها و رزروها
          </button>
          <button
            className={activeTab === 'profile' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('profile')}
          >
            <UserRound size={18} />
            اطلاعات حساب
          </button>
          <button
            className={activeTab === 'transactions' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('transactions')}
          >
            <ReceiptText size={18} />
            تراکنش‌ها
          </button>
          <button
            className={activeTab === 'reports' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('reports')}
          >
            <Flag size={18} />
            گزارش‌های من
          </button>
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-stats">
            <article>
              <ReceiptText size={22} />
              <div>
                <span>تعداد خریدها</span>
                <strong>{formatNumber(stats.count)}</strong>
              </div>
            </article>
            <article>
              <TicketCheck size={22} />
              <div>
                <span>تعداد بلیط‌ها</span>
                <strong>{formatNumber(stats.tickets)}</strong>
              </div>
            </article>
            <article>
              <CreditCard size={22} />
              <div>
                <span>مجموع پرداخت</span>
                <strong>{formatNumber(stats.total)} <small>تومان</small></strong>
              </div>
            </article>
          </div>

          {message && (
            <div className={`form-message ${message.type}`} role="status">
              {message.text}
            </div>
          )}

          {activeTab === 'bookings' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>خریدها و رزروها</h2>
                  <p>وضعیت بلیط، کنسلی و گزارش مشکلات را از این قسمت مدیریت کنید.</p>
                </div>
                <Link className="secondary-button dashboard-small-button" to="/tickets">
                  خرید بلیط جدید
                </Link>
              </div>

              {bookings.length === 0 ? (
                <div className="dashboard-empty">
                  <TicketCheck size={38} />
                  <h3>هنوز بلیطی خریداری نکرده‌اید</h3>
                  <p>پس از تکمیل پرداخت، اطلاعات بلیط در این قسمت ثبت می‌شود.</p>
                  <Link className="primary-button" to="/tickets">
                    مشاهده مسابقات
                  </Link>
                </div>
              ) : (
                <div className="booking-history-list">
                  {bookings.map((booking) => {
                    const ticket = booking.ticket || {};
                    const isCancelled = booking.status === 'cancelled';
                    return (
                      <article className={`booking-history-item ${isCancelled ? 'cancelled' : ''}`} key={booking.id}>
                        <div className="booking-history-main">
                          <span className={`booking-status ${isCancelled ? 'cancelled' : ''}`}>
                            {booking.statusLabel || 'پرداخت‌شده'}
                          </span>
                          <h3>{ticket.homeTeam || 'تیم میزبان'} - {ticket.awayTeam || 'تیم مهمان'}</h3>
                          <p><CalendarDays size={15} /> {ticket.date || 'تاریخ ثبت نشده'}، ساعت {ticket.time || '--:--'}</p>
                          <p><MapPin size={15} /> {ticket.venue || 'محل برگزاری ثبت نشده'}</p>
                        </div>
                        <div className="booking-history-info">
                          <span>تعداد: <strong>{formatNumber(booking.quantity || 1)}</strong></span>
                          <span>جایگاه: <strong>{ticket.section || ticket.category || 'عادی'}</strong></span>
                          <span>خرید: <strong>{formatDate(booking.paidAt)}</strong></span>
                          {isCancelled && (
                            <span>استرداد: <strong>{formatNumber(booking.refundAmount)} تومان</strong></span>
                          )}
                        </div>
                        <div className="booking-history-price">
                          <span>مبلغ پرداختی</span>
                          <strong>{formatNumber(booking.amount)} تومان</strong>
                          <div className="booking-actions">
                            {ticket.id && <Link to={`/tickets/${ticket.id}`}>مشاهده مسابقه</Link>}
                            {!isCancelled && (
                              <Link className="cancel-action" to={`/dashboard/bookings/${booking.id}/cancel`}>
                                <RotateCcw size={14} /> کنسلی
                              </Link>
                            )}
                            <Link className="report" to={`/dashboard/bookings/${booking.id}/report`}>
                              <CircleAlert size={14} /> گزارش مشکل
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'profile' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>ویرایش اطلاعات حساب</h2>
                  <p>نام، اطلاعات تماس و شهر محل سکونت خود را ویرایش کنید.</p>
                </div>
              </div>

              <form className="profile-form-simple" onSubmit={saveProfile}>
                <div className="profile-two-fields">
                  <label>
                    نام
                    <input
                      required
                      minLength={3}
                      maxLength={60}
                      value={profile.firstName || ''}
                      onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
                    />
                  </label>
                  <label>
                    نام خانوادگی
                    <input
                      required
                      minLength={3}
                      maxLength={60}
                      value={profile.lastName || ''}
                      onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                    />
                  </label>
                </div>
                <div className="profile-two-fields">
                  <label>
                    ایمیل
                    <input
                      required
                      type="email"
                      value={profile.email || ''}
                      onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                    />
                  </label>
                  <label>
                    شماره تماس
                    <input
                      inputMode="numeric"
                      maxLength={11}
                      pattern="09[0-9]{9}"
                      value={profile.phoneNumber || ''}
                      onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })}
                    />
                  </label>
                </div>
                <label>
                  شهر محل سکونت
                  <input
                    value={profile.city || ''}
                    onChange={(event) => setProfile({ ...profile, city: event.target.value })}
                    placeholder="مثلاً تهران"
                  />
                </label>
                <button className="primary-button profile-save-button" type="submit" disabled={saving}>
                  {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'transactions' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>تاریخچه تراکنش‌ها</h2>
                  <p>پرداخت‌های انجام‌شده در نسخه آزمایشی پروژه.</p>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="dashboard-empty compact">
                  <CreditCard size={34} />
                  <h3>تراکنشی ثبت نشده است</h3>
                  <p>بعد از پرداخت موفق، تراکنش شما در این بخش نمایش داده می‌شود.</p>
                </div>
              ) : (
                <div className="transaction-history">
                  <div className="transaction-row transaction-head">
                    <span>شناسه رزرو</span>
                    <span>روش پرداخت</span>
                    <span>زمان پرداخت</span>
                    <span>مبلغ</span>
                  </div>
                  {bookings.map((booking) => (
                    <div className="transaction-row" key={`transaction-${booking.id}`}>
                      <span>{booking.id}</span>
                      <span>{paymentMethodLabels[booking.paymentMethod] || 'پرداخت آنلاین'}</span>
                      <span>{formatDate(booking.paidAt)}</span>
                      <strong>{formatNumber(booking.amount)} تومان</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'reports' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>گزارش‌های ثبت‌شده</h2>
                  <p>وضعیت گزارش‌هایی که برای پشتیبان ارسال کرده‌اید.</p>
                </div>
                <Flag size={22} />
              </div>

              {reports.length === 0 ? (
                <div className="dashboard-empty compact">
                  <Flag size={34} />
                  <h3>هنوز گزارشی ثبت نشده است</h3>
                  <p>برای ثبت گزارش، از بخش خریدها گزینه «گزارش مشکل» را انتخاب کنید.</p>
                </div>
              ) : (
                <div className="reports-list">
                  {reports.map((report) => (
                    <article className="report-history-item" key={report.id}>
                      <div>
                        <span className="report-status">{report.statusLabel || 'در انتظار بررسی'}</span>
                        <h3>{reportCategoryLabels[report.category] || 'گزارش بلیط'}</h3>
                        <p>{report.ticket?.homeTeam} - {report.ticket?.awayTeam}</p>
                      </div>
                      <p className="report-description">{report.description}</p>
                      <div className="report-meta">
                        <span>شناسه: {report.id}</span>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </section>
    </div>
  );
}
