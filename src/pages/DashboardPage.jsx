import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CreditCard,
  MapPin,
  PencilLine,
  ReceiptText,
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
  const [profile, setProfile] = useState(user || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      ticketService.getBookings(),
      userService.getProfile().catch(() => user),
    ])
      .then(([items, fetchedProfile]) => {
        if (!active) return;
        setBookings(Array.isArray(items) ? items : []);
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
                  <p>بلیط‌های پرداخت‌شده شما در این بخش نمایش داده می‌شوند.</p>
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
                    return (
                      <article className="booking-history-item" key={booking.id}>
                        <div className="booking-history-main">
                          <span className="booking-status">{booking.statusLabel || 'پرداخت‌شده'}</span>
                          <h3>{ticket.homeTeam || 'تیم میزبان'} - {ticket.awayTeam || 'تیم مهمان'}</h3>
                          <p><CalendarDays size={15} /> {ticket.date || 'تاریخ ثبت نشده'}، ساعت {ticket.time || '--:--'}</p>
                          <p><MapPin size={15} /> {ticket.venue || 'محل برگزاری ثبت نشده'}</p>
                        </div>
                        <div className="booking-history-info">
                          <span>تعداد: <strong>{formatNumber(booking.quantity || 1)}</strong></span>
                          <span>جایگاه: <strong>{ticket.section || ticket.category || 'عادی'}</strong></span>
                          <span>خرید: <strong>{formatDate(booking.paidAt)}</strong></span>
                        </div>
                        <div className="booking-history-price">
                          <span>مبلغ پرداختی</span>
                          <strong>{formatNumber(booking.amount)} تومان</strong>
                          {ticket.id && (
                            <Link to={`/tickets/${ticket.id}`}>مشاهده مسابقه</Link>
                          )}
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
                      value={profile.firstName || ''}
                      onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
                    />
                  </label>
                  <label>
                    نام خانوادگی
                    <input
                      required
                      value={profile.lastName || ''}
                      onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                    />
                  </label>
                </div>
                <div className="profile-two-fields">
                  <label>
                    ایمیل
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                    />
                  </label>
                  <label>
                    شماره تماس
                    <input
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
        </main>
      </section>
    </div>
  );
}
