import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Hash,
  Armchair,
  MapPin,
  Ban,
} from 'lucide-react';
import Loading from '../components/Loading.jsx';
import ReservationCountdown from '../components/ReservationCountdown.jsx';
import { ticketService } from '../services/ticketService.js';

const statusLabels = {
  ACTIVE: 'فعال',
  EXPIRED: 'منقضی‌شده',
  COMPLETED: 'تکمیل‌شده',
  CANCELLED: 'لغوشده',
};

const statusColors = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
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

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value || 0);

export default function ReservationDetailPage() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const reloadDetail = () => {
    ticketService
      .getReservationById(reservationId)
      .then(setData)
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    ticketService
      .getReservationById(reservationId)
      .then(setData)
      .catch((err) => setError(err.message || 'خطا در دریافت جزئیات رزرو.'))
      .finally(() => setLoading(false));
  }, [reservationId]);

  const handleCancel = async () => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید این رزرو را لغو کنید؟')) return;
    setCancelling(true);
    setMessage(null);
    try {
      await ticketService.cancelReservation(reservationId);
      setMessage({ type: 'info', text: 'رزرو با موفقیت لغو شد.' });
      setData((prev) => ({
        ...prev,
        reservation: { ...prev.reservation, status: 'CANCELLED' },
      }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'لغو رزرو انجام نشد.' });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loading label="در حال دریافت جزئیات رزرو..." />;

  if (error) {
    return (
      <div className="container reservation-detail-page">
        <div className="form-message error" role="status">{error}</div>
        <Link className="secondary-button" to="/dashboard">
          <ArrowRight size={16} />
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  const reservation = data.reservation || {};
  const seats = data.reservation_seats || [];
  const status = reservation.status || '';
  const isActive = status === 'ACTIVE';

  const totalPrice = seats.reduce(
    (sum, seat) => sum + Number(seat.ticket_config?.price || 0),
    0,
  );

  return (
    <div className="container reservation-detail-page">
      <div className="reservation-detail-header">
        <Link className="reservation-detail-back" to="/dashboard">
          <ArrowRight size={16} />
          بازگشت
        </Link>
        <h1>جزئیات رزرو</h1>
      </div>

      {message && (
        <div className={`form-message ${message.type}`} role="status">
          {message.text}
        </div>
      )}

      <div className="reservation-detail-card">
        <div className="reservation-detail-top">
          <div>
            <div className="reservation-detail-status-row">
              <span className={`reservation-status ${statusColors[status] || ''}`}>
                {statusLabels[status] || status}
              </span>
              {isActive && (
                <ReservationCountdown
                  expiresAt={reservation.expires_at}
                  onExpired={reloadDetail}
                />
              )}
            </div>
            <h2>رزرو شماره {formatNumber(reservation.reservation_id)}</h2>
          </div>
          {isActive && (
            <button
              className="cancel-reservation-button"
              type="button"
              disabled={cancelling}
              onClick={handleCancel}
            >
              <Ban size={15} />
              {cancelling ? 'در حال لغو...' : 'لغو رزرو'}
            </button>
          )}
        </div>

        <div className="reservation-detail-meta">
          <div>
            <CalendarDays size={15} />
            <span>تاریخ ثبت:</span>
            <strong>{formatDate(reservation.created_at)}</strong>
          </div>
          <div>
            <CalendarClock size={15} />
            <span>تاریخ انقضا:</span>
            <strong>{formatDate(reservation.expires_at)}</strong>
          </div>
          <div>
            <Hash size={15} />
            <span>شناسه رزرو:</span>
            <strong>{formatNumber(reservation.reservation_id)}</strong>
          </div>
          {data.order_id && (
            <div>
              <Hash size={15} />
              <span>شناسه سفارش:</span>
              <strong>{formatNumber(data.order_id)}</strong>
            </div>
          )}
          {data.match_id && (
            <div>
              <MapPin size={15} />
              <span>شناسه مسابقه:</span>
              <strong>{formatNumber(data.match_id)}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="reservation-detail-seats-section">
        <h3>
          <Armchair size={18} />
          صندلی‌ها ({formatNumber(seats.length)})
        </h3>

        {seats.length === 0 ? (
          <p className="reservation-detail-no-seats">اطلاعات صندلی موجود نیست.</p>
        ) : (
          <div className="reservation-detail-seats">
            <div className="reservation-seat-row reservation-seat-head">
              <span>صندلی</span>
              <span>ردیف</span>
              <span>سکتور</span>
              <span>دسته‌بندی</span>
              <span>قیمت</span>
            </div>
            {seats.map((seat) => (
              <div className="reservation-seat-row" key={seat.seat_id}>
                <span><strong>{formatNumber(seat.seat_no)}</strong></span>
                <span>{formatNumber(seat.row_no)}</span>
                <span>{formatNumber(seat.section)}</span>
                <span>{seat.ticket_config?.category?.name || '—'}</span>
                <strong>{formatNumber(seat.ticket_config?.price)} تومان</strong>
              </div>
            ))}
            <div className="reservation-seat-row reservation-seat-total">
              <span></span>
              <span></span>
              <span></span>
              <span>جمع کل</span>
              <strong>{formatNumber(totalPrice)} تومان</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
