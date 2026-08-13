import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Search,
  TicketCheck,
  XCircle,
} from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { supportService } from '../services/supportService.js';

const reportStatusLabels = {
  pending: 'در انتظار بررسی',
  reviewing: 'در حال بررسی',
  resolved: 'رسیدگی‌شده',
};

const categoryLabels = {
  payment: 'مشکل در پرداخت',
  ticket_info: 'اشتباه در اطلاعات بلیط',
  seat: 'مشکل در جایگاه یا صندلی',
  schedule: 'تغییر زمان مسابقه',
  unexpected_cancel: 'کنسلی غیرمنتظره',
  other: 'سایر موارد',
};

const formatPrice = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const formatDate = (value) => {
  if (!value) return '---';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

export default function SupportPage() {
  const [reports, setReports] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeSection, setActiveSection] = useState('reports');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      supportService.getReports(),
      supportService.getReservations(),
    ])
      .then(([reportItems, reservationItems]) => {
        if (!active) return;
        setReports(reportItems);
        setReservations(reservationItems);
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
  }, []);

  const filteredReports = useMemo(() => reports.filter((report) => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchable = [
      report.id,
      report.bookingId,
      report.reporterName,
      report.reporterContact,
      report.categoryLabel,
      categoryLabels[report.category],
      report.ticketTitle,
    ].join(' ').toLowerCase();

    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [reports, query, statusFilter]);

  const filteredReservations = useMemo(() => reservations.filter((reservation) => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchable = [
      reservation.id,
      reservation.userName,
      reservation.userContact,
      reservation.ticketTitle,
      reservation.issue,
    ].join(' ').toLowerCase();

    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all'
      || reservation.reviewStatus === statusFilter
      || reservation.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [reservations, query, statusFilter]);

  const resolvedReports = reports.filter((report) => report.status === 'resolved').length;
  const suspiciousReservations = reservations.filter((item) => item.reviewStatus === 'suspicious').length;

  const answerReport = async (reportId) => {
    const response = window.prompt('پاسخ نهایی گزارش را وارد کنید:');
    if (response === null) return;
    if (!response.trim()) {
      setMessage({ type: 'error', text: 'پاسخ گزارش نمی‌تواند خالی باشد.' });
      return;
    }

    setWorkingId(reportId);
    setMessage(null);
    try {
      const updatedReport = await supportService.answerReport(reportId, response.trim());
      setReports((current) => current.map((report) => (
        report.id === reportId ? { ...report, ...updatedReport } : report
      )));
      setMessage({ type: 'success', text: 'وضعیت گزارش به‌روزرسانی شد.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setWorkingId('');
    }
  };

  const reviewReservation = async (reservationId, action) => {
    setWorkingId(reservationId);
    setMessage(null);
    try {
      const updatedReservation = await supportService.reviewReservation(reservationId, action);
      setReservations((current) => current.map((reservation) => (
        reservation.id === reservationId ? { ...reservation, ...updatedReservation } : reservation
      )));
      setMessage({
        type: 'success',
        text: action === 'cancel' ? 'رزرو توسط پشتیبان لغو شد.' : 'رزرو با موفقیت تأیید شد.',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setWorkingId('');
    }
  };

  const selectSection = (section) => {
    setActiveSection(section);
    setStatusFilter('all');
    setQuery('');
    setMessage(null);
  };

  if (loading) return <Loading label="در حال دریافت اطلاعات پنل پشتیبانی..." />;

  return (
    <div className="support-page">
      <section className="support-header-section">
        <div className="container support-heading">
          <span className="support-heading-icon"><Headphones size={23} /></span>
          <div>
            <h1>پنل پشتیبانی</h1>
            <p>بررسی گزارش‌های کاربران و رزروهای مشکوک یا مشکل‌دار</p>
          </div>
        </div>
      </section>

      <div className="container support-content">
        <section className="support-stats" aria-label="آمار پنل پشتیبانی">
          <article>
            <CheckCircle2 size={22} />
            <div>
              <strong>{new Intl.NumberFormat('fa-IR').format(resolvedReports)}</strong>
              <span>گزارش رسیدگی‌شده</span>
            </div>
          </article>
          <article>
            <ClipboardCheck size={22} />
            <div>
              <strong>{new Intl.NumberFormat('fa-IR').format(suspiciousReservations)}</strong>
              <span>رزرو نیازمند بررسی</span>
            </div>
          </article>
        </section>

        <section className="support-panel">
          <div className="support-section-tabs">
            <button
              className={activeSection === 'reports' ? 'active' : ''}
              type="button"
              onClick={() => selectSection('reports')}
            >
              گزارش‌های کاربران
            </button>
            <button
              className={activeSection === 'reservations' ? 'active' : ''}
              type="button"
              onClick={() => selectSection('reservations')}
            >
              رزروهای قابل بررسی
            </button>
          </div>

          <div className="support-toolbar">
            <label className="support-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeSection === 'reports'
                  ? 'جستجو با نام کاربر، موضوع یا شناسه گزارش'
                  : 'جستجو با نام کاربر، مسابقه یا شناسه رزرو'}
              />
            </label>

            <label className="support-filter">
              وضعیت
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">همه وضعیت‌ها</option>
                {activeSection === 'reports' ? (
                  <>
                    <option value="pending">در انتظار بررسی</option>
                    <option value="reviewing">در حال بررسی</option>
                    <option value="resolved">رسیدگی‌شده</option>
                  </>
                ) : (
                  <>
                    <option value="suspicious">نیازمند بررسی</option>
                    <option value="approved">تأییدشده</option>
                    <option value="cancelled">لغوشده</option>
                  </>
                )}
              </select>
            </label>
          </div>

          {message && (
            <div className={`form-message ${message.type}`} role="status">
              {message.text}
            </div>
          )}

          {activeSection === 'reports' ? (
            <div className="support-list">
              {filteredReports.length ? filteredReports.map((report) => (
                <article className="support-report-card" key={report.id}>
                  <div className="support-card-main">
                    <div className="support-card-title">
                      <span className={`support-status status-${report.status}`}>
                        {report.statusLabel || reportStatusLabels[report.status]}
                      </span>
                      <strong>{report.categoryLabel || categoryLabels[report.category] || report.category}</strong>
                    </div>
                    <h2>{report.ticketTitle || report.ticketId}</h2>
                    <p>{report.description}</p>
                    <div className="support-card-meta">
                      <span>کاربر: {report.reporterName}</span>
                      <span>تماس: {report.reporterContact}</span>
                      <span>رزرو: {report.bookingId}</span>
                      <span>ثبت: {formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                  <div className="support-card-actions">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={workingId === report.id || report.status === 'resolved'}
                      onClick={() => answerReport(report.id)}
                    >
                      ثبت پاسخ و بستن گزارش
                    </button>
                  </div>
                </article>
              )) : (
                <div className="support-empty">گزارشی با این شرایط پیدا نشد.</div>
              )}
            </div>
          ) : (
            <div className="support-list">
              {filteredReservations.length ? filteredReservations.map((reservation) => (
                <article className="support-reservation-card" key={reservation.id}>
                  <div className="support-card-main">
                    <div className="support-card-title">
                      <span className={`support-status status-${reservation.reviewStatus}`}>
                        {reservation.reviewStatusLabel}
                      </span>
                      <strong>{reservation.id}</strong>
                    </div>
                    <h2>{reservation.ticketTitle}</h2>
                    <p>{reservation.issue}</p>
                    <div className="support-card-meta">
                      <span>کاربر: {reservation.userName}</span>
                      <span>تماس: {reservation.userContact}</span>
                      <span>تعداد: {new Intl.NumberFormat('fa-IR').format(reservation.quantity || 1)}</span>
                      <span>مبلغ: {formatPrice(reservation.amount)}</span>
                      <span>ثبت: {formatDate(reservation.createdAt)}</span>
                    </div>
                  </div>
                  <div className="support-card-actions">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={workingId === reservation.id || reservation.reviewStatus === 'approved'}
                      onClick={() => reviewReservation(reservation.id, 'approve')}
                    >
                      <TicketCheck size={16} />
                      تأیید رزرو
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      disabled={workingId === reservation.id || reservation.status === 'cancelled'}
                      onClick={() => reviewReservation(reservation.id, 'cancel')}
                    >
                      <XCircle size={16} />
                      لغو رزرو
                    </button>
                  </div>
                </article>
              )) : (
                <div className="support-empty">رزروی با این شرایط پیدا نشد.</div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
