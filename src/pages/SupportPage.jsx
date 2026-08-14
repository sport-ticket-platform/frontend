import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Headphones, Search } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { supportService } from '../services/supportService.js';

const categoryLabels = {
  payment: 'مشکل در پرداخت',
  ticket_info: 'اشتباه در اطلاعات بلیط',
  seat: 'مشکل در جایگاه یا صندلی',
  unexpected_cancel: 'کنسلی غیرمنتظره',
  other: 'سایر موارد',
};

const formatDate = (value) => {
  if (!value) return '---';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

export default function SupportPage() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    supportService.getReports()
      .then((items) => { if (active) setReports(items); })
      .catch((error) => {
        if (active) setMessage({ type: 'error', text: error.message });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredReports = useMemo(() => reports.filter((report) => {
    const needle = query.trim().toLowerCase();
    const searchable = [
      report.id,
      report.reporterName,
      report.categoryLabel,
      categoryLabels[report.category],
      report.ticketTitle,
    ].join(' ').toLowerCase();
    return (!needle || searchable.includes(needle))
      && (statusFilter === 'all' || report.status === statusFilter);
  }), [reports, query, statusFilter]);

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
      const updated = await supportService.answerReport(reportId, response.trim());
      setReports((current) => current.map((report) => (
        report.id === reportId ? { ...report, ...updated } : report
      )));
      setMessage({ type: 'success', text: 'پاسخ گزارش ثبت شد.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setWorkingId('');
    }
  };

  if (loading) return <Loading label="در حال دریافت گزارش‌ها..." />;
  const resolvedCount = reports.filter((report) => report.status === 'resolved').length;

  return (
    <div className="support-page">
      <section className="support-header-section">
        <div className="container support-heading">
          <span className="support-heading-icon"><Headphones size={23} /></span>
          <div><h1>پنل پشتیبانی</h1><p>بررسی و پاسخ به گزارش‌های کاربران</p></div>
        </div>
      </section>
      <div className="container support-content">
        <section className="support-stats">
          <article>
            <CheckCircle2 size={22} />
            <div><strong>{resolvedCount}</strong><span>گزارش رسیدگی‌شده</span></div>
          </article>
        </section>
        <section className="support-panel">
          <div className="support-toolbar">
            <label className="support-search">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در گزارش‌ها" />
            </label>
            <label className="support-filter">
              وضعیت
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">همه</option>
                <option value="pending">در انتظار بررسی</option>
                <option value="resolved">رسیدگی‌شده</option>
              </select>
            </label>
          </div>
          {message && <div className={`form-message ${message.type}`} role="status">{message.text}</div>}
          <div className="support-list">
            {filteredReports.length ? filteredReports.map((report) => (
              <article className="support-report-card" key={report.id}>
                <div className="support-card-main">
                  <div className="support-card-title">
                    <span className={`support-status status-${report.status}`}>{report.statusLabel}</span>
                    <strong>{categoryLabels[report.category] || report.categoryLabel}</strong>
                  </div>
                  <h2>{report.ticketTitle}</h2>
                  <p>{report.description}</p>
                  <div className="support-card-meta">
                    <span>کاربر: {report.reporterName}</span>
                    <span>ثبت: {formatDate(report.createdAt)}</span>
                  </div>
                </div>
                <div className="support-card-actions">
                  <button className="primary-button" type="button" disabled={workingId === report.id || report.status === 'resolved'} onClick={() => answerReport(report.id)}>
                    ثبت پاسخ و بستن گزارش
                  </button>
                </div>
              </article>
            )) : <div className="support-empty">گزارشی پیدا نشد.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
