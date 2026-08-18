import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Eye,
  Flag,
  MapPin,
  PencilLine,
  ReceiptText,
  TicketCheck,
  UserRound,
} from 'lucide-react';
import Loading from '../components/Loading.jsx';
import ReservationCountdown from '../components/ReservationCountdown.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ticketService } from '../services/ticketService.js';
import { userService } from '../services/userService.js';

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value || 0);

const reservationStatusLabels = {
  ACTIVE: 'فعال',
  EXPIRED: 'منقضی‌شده',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
};

const reservationStatusColors = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

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
  const [activeTab, setActiveTab] = useState('reservations');
  const [bookings, setBookings] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [reservationPage, setReservationPage] = useState(0);
  const [reservationMeta, setReservationMeta] = useState({ totalPages: 1, isFirst: true, isLast: true });
  const [reservationFilter, setReservationFilter] = useState('');
  const [reservationCounts, setReservationCounts] = useState({});
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(user || {});
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      ticketService.getBookings(),
      ticketService.getReports(),
      userService.getProfile().catch(() => user),
      userService.searchCities('', 40, 0).catch(() => []),
    ])
      .then(([items, reportItems, fetchedProfile, cityItems]) => {
        if (!active) return;
        setBookings(Array.isArray(items) ? items : []);
        setReports(Array.isArray(reportItems) ? reportItems : []);
        if (fetchedProfile) setProfile({ ...user, ...fetchedProfile });
        setCities(cityItems);
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

  const loadReservations = async (page = 0, status = '') => {
    setReservationsLoading(true);
    try {
      const result = await ticketService.getReservationHistory(page, 10, status || null);
      setReservations(result.items);
      setReservationMeta({
        totalPages: result.totalPages,
        isFirst: result.isFirst,
        isLast: result.isLast,
      });
      setReservationPage(result.currentPage);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setReservationsLoading(false);
    }
  };

  const loadCounts = () => {
    ticketService.getReservationCounts().then(setReservationCounts).catch(() => {});
  };

  useEffect(() => {
    loadCounts();
  }, []);

  useEffect(() => {
    loadReservations(0, reservationFilter);
  }, [reservationFilter]);

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید این رزرو را لغو کنید؟')) return;
    setCancellingId(reservationId);
    try {
      await ticketService.cancelReservation(reservationId);
      setMessage({ type: 'info', text: 'رزرو با موفقیت لغو شد.' });
      loadReservations(reservationPage, reservationFilter);
      loadCounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'لغو رزرو انجام نشد.' });
    } finally {
      setCancellingId(null);
    }
  };

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
            className={activeTab === 'reservations' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('reservations')}
          >
            <CalendarClock size={18} />
            رزروها
          </button>
          <button
            className={activeTab === 'bookings' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('bookings')}
          >
            <TicketCheck size={18} />
            سفارش‌ها
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

          {activeTab === 'reservations' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>رزروهای من</h2>
                  <p>وضعیت رزروهای خود را مشاهده و پیگیری کنید.</p>
                </div>
              </div>

              <div className="reservation-filters">
                <button
                  className={reservationFilter === '' ? 'active' : ''}
                  type="button"
                  onClick={() => setReservationFilter('')}
                >
                  همه {reservationCounts.ALL !== undefined && <span className="filter-count">({formatNumber(reservationCounts.ALL)})</span>}
                </button>
                <button
                  className={reservationFilter === 'ACTIVE' ? 'active' : ''}
                  type="button"
                  onClick={() => setReservationFilter('ACTIVE')}
                >
                  فعال {reservationCounts.ACTIVE !== undefined && <span className="filter-count">({formatNumber(reservationCounts.ACTIVE)})</span>}
                </button>
                <button
                  className={reservationFilter === 'COMPLETED' ? 'active' : ''}
                  type="button"
                  onClick={() => setReservationFilter('COMPLETED')}
                >
                  تکمیل‌شده {reservationCounts.COMPLETED !== undefined && <span className="filter-count">({formatNumber(reservationCounts.COMPLETED)})</span>}
                </button>
                <button
                  className={reservationFilter === 'EXPIRED' ? 'active' : ''}
                  type="button"
                  onClick={() => setReservationFilter('EXPIRED')}
                >
                  منقضی‌شده {reservationCounts.EXPIRED !== undefined && <span className="filter-count">({formatNumber(reservationCounts.EXPIRED)})</span>}
                </button>
                <button
                  className={reservationFilter === 'CANCELLED' ? 'active' : ''}
                  type="button"
                  onClick={() => setReservationFilter('CANCELLED')}
                >
                  لغوشده {reservationCounts.CANCELLED !== undefined && <span className="filter-count">({formatNumber(reservationCounts.CANCELLED)})</span>}
                </button>
              </div>

              {reservationsLoading ? (
                <div className="dashboard-empty compact">
                  <p>در حال بارگذاری...</p>
                </div>
              ) : reservations.length === 0 ? (
                <div className="dashboard-empty compact">
                  <CalendarClock size={34} />
                  <h3>رزروی یافت نشد</h3>
                  <p>
                    {reservationFilter
                      ? 'رزروی با این وضعیت وجود ندارد.'
                      : 'هنوز رزروی ثبت نکرده‌اید.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="reservation-history-list">
                    {reservations.map((reservation) => {
                      const isActive = reservation.status === 'ACTIVE';
                      return (
                        <article
                          className={`reservation-history-item ${reservationStatusColors[reservation.status] || ''}`}
                          key={reservation.reservation_id}
                        >
                          <div className="reservation-history-main">
                            <div className="reservation-status-row">
                              <span className={`reservation-status ${reservationStatusColors[reservation.status] || ''}`}>
                                {reservationStatusLabels[reservation.status] || reservation.status}
                              </span>
                              {isActive && (
                                <ReservationCountdown
                                  expiresAt={reservation.expires_at}
                                  onExpired={() => {
                                    loadReservations(reservationPage, reservationFilter);
                                    loadCounts();
                                  }}
                                />
                              )}
                            </div>
                            <p>
                              <CalendarDays size={15} />
                              {' '}ثبت: {formatDate(reservation.created_at)}
                            </p>
                            <p>
                              <CalendarClock size={15} />
                              {' '}انقضا: {formatDate(reservation.expires_at)}
                            </p>
                          </div>
                          <div className="reservation-history-actions">
                            <Link
                              className="reservation-detail-btn"
                              to={`/dashboard/reservations/${reservation.reservation_id}`}
                            >
                              <Eye size={14} />
                              جزئیات
                            </Link>
                            {isActive && (
                              <button
                                className="reservation-cancel-btn"
                                type="button"
                                disabled={cancellingId === reservation.reservation_id}
                                onClick={() => handleCancelReservation(reservation.reservation_id)}
                              >
                                <Ban size={14} />
                                {cancellingId === reservation.reservation_id ? 'در حال لغو...' : 'لغو رزرو'}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {reservationMeta.totalPages > 1 && (
                    <div className="reservation-pagination">
                      <button
                        type="button"
                        disabled={reservationMeta.isFirst}
                        onClick={() => loadReservations(reservationPage - 1, reservationFilter)}
                      >
                        <ChevronRight size={16} />
                        قبلی
                      </button>
                      <span>صفحه {(reservationPage + 1).toLocaleString('fa-IR')} از {reservationMeta.totalPages.toLocaleString('fa-IR')}</span>
                      <button
                        type="button"
                        disabled={reservationMeta.isLast}
                        onClick={() => loadReservations(reservationPage + 1, reservationFilter)}
                      >
                        بعدی
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {activeTab === 'bookings' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel-title">
                <div>
                  <h2>سفارش‌ها</h2>
                  <p>وضعیت بلیط و گزارش مشکلات را از این قسمت مدیریت کنید.</p>
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
                    list="profile-city-options"
                    value={profile.city || ''}
                    onChange={(event) => setProfile({ ...profile, city: event.target.value })}
                    placeholder="مثلاً تهران"
                  />
                  <datalist id="profile-city-options">
                    {cities.map((city) => <option key={city.cityId} value={city.name} />)}
                  </datalist>
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
                  <p>پرداخت‌های ثبت‌شده در سرویس رزرو.</p>
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
