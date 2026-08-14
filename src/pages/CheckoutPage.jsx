import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { ticketService } from '../services/ticketService.js';
import { storage } from '../services/storage.js';

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value || 0);

export default function CheckoutPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const countdown = useCountdown(reservation?.expiresAt);

  useEffect(() => {
    let active = true;

    const prepareCheckout = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const currentReservation = storage.get('activeReservation');
        const invalidReservation = !currentReservation
          || String(currentReservation.ticketId) !== String(ticketId)
          || new Date(currentReservation.expiresAt).getTime() <= Date.now();

        if (invalidReservation) {
          storage.remove('activeReservation');
          throw new Error(
            'رزرو فعالی برای این مسابقه وجود ندارد. ابتدا صندلی را انتخاب کنید.',
          );
        }

        const selectedTicket = currentReservation.ticket
          || await ticketService.getById(ticketId);

        if (!selectedTicket) {
          throw new Error('اطلاعات مسابقه پیدا نشد.');
        }

        if (active) {
          setTicket(selectedTicket);
          setReservation(currentReservation);
        }
      } catch (error) {
        if (active) {
          setMessage({
            type: 'error',
            text: error.message,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    prepareCheckout();

    return () => {
      active = false;
    };
  }, [ticketId]);

  const quantity = reservation?.quantity
    || reservation?.seatIds?.length
    || 1;
  const unitPrice = Number(
    reservation?.unitPrice
    || ticket?.price
    || 0,
  );
  const totalPrice = useMemo(
    () => Number(reservation?.amount || unitPrice * quantity),
    [reservation, unitPrice, quantity],
  );

  const submitPayment = async () => {
    if (!reservation) return;

    if (countdown.expired) {
      setMessage({
        type: 'error',
        text: 'زمان رزرو تمام شده است. دوباره صندلی‌ها را انتخاب کنید.',
      });
      return;
    }

    setPaying(true);
    setMessage(null);

    try {
      const result = await ticketService.pay(reservation.id);
      if (result.token) setPaymentSession(result);
      else setPaymentResult(result);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message,
      });
    } finally {
      setPaying(false);
    }
  };

  const finishPayment = async (status) => {
    if (!paymentSession?.token) return;
    setPaying(true);
    setMessage(null);
    try {
      const result = await ticketService.completePayment(paymentSession.token, status);
      if (status === 'FAILED') {
        setPaymentSession(null);
        setMessage({ type: 'error', text: 'پرداخت ناموفق ثبت شد؛ می‌توانید دوباره تلاش کنید.' });
        return;
      }
      storage.remove('activeReservation');
      setPaymentResult({
        success: true,
        trackingCode: result.ref_id || result.refId || 'ثبت‌شده',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <Loading label="در حال آماده‌سازی صفحه پرداخت..." />;
  }

  if (!ticket || !reservation) {
    return (
      <section className="page-section">
        <div className="container simple-message">
          <h1>امکان ادامه پرداخت وجود ندارد</h1>
          <p>{message?.text || 'اطلاعات رزرو در دسترس نیست.'}</p>
          <Link className="primary-button" to={`/tickets/${ticketId}`}>
            بازگشت و انتخاب صندلی
          </Link>
        </div>
      </section>
    );
  }

  if (paymentResult) {
    return (
      <section className="payment-success-section">
        <div className="container payment-success-card">
          <CheckCircle2 size={48} />
          <h1>پرداخت با موفقیت انجام شد</h1>
          <p>
            پرداخت برای مسابقه{' '}
            <strong>
              {ticket.homeTeam} - {ticket.awayTeam}
            </strong>{' '}
          </p>
          <div className="tracking-code">
            <span>کد پیگیری</span>
            <strong>{paymentResult.trackingCode}</strong>
          </div>
          <div className="payment-success-actions">
            <Link className="primary-button" to="/dashboard">
              مشاهده خریدهای من
            </Link>
            <Link className="secondary-button" to="/tickets">
              خرید بلیط دیگر
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (paymentSession) {
    const gateway = paymentSession.gatewayInfo || {};
    return (
      <section className="payment-success-section">
        <div className="container payment-success-card">
          <Clock3 size={48} />
          <h1>درگاه پرداخت</h1>
          <p>مبلغ نهایی: <strong>{formatNumber(gateway.total_amount)} تومان</strong></p>
          <p>کارمزد: {formatNumber(gateway.percentage_amount)} تومان</p>
          {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
          <div className="payment-success-actions">
            <button className="primary-button" type="button" disabled={paying} onClick={() => finishPayment('SUCCESS')}>
              پرداخت موفق
            </button>
            <button className="secondary-button" type="button" disabled={paying} onClick={() => finishPayment('FAILED')}>
              پرداخت ناموفق
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container checkout-breadcrumb">
        <Link to={`/tickets/${ticket.id}`}>
          <ArrowRight size={16} />
          بازگشت به جزئیات بلیط
        </Link>
      </div>

      <section className="container checkout-layout">
        <div className="checkout-payment-card">
          <div className="checkout-heading">
            <div>
              <span className="page-label">مرحله نهایی</span>
              <h1>تکمیل پرداخت</h1>
            </div>
            <div className={`reservation-countdown${countdown.seconds < 120 ? ' warning' : ''}`}>
              <Clock3 size={19} />
              <span>زمان باقی‌مانده رزرو</span>
              <strong>{countdown.formatted}</strong>
            </div>
          </div>
          {message && (
            <div className={`form-message ${message.type}`} role="status">
              {message.text}
            </div>
          )}

          <button
            className="checkout-pay-button"
            type="button"
            onClick={submitPayment}
            disabled={paying || countdown.expired}
          >
            {countdown.expired
              ? 'زمان انتخاب پایان یافته است'
              : paying
                ? 'در حال ثبت پرداخت...'
                : `پرداخت ${formatNumber(totalPrice)} تومان`}
          </button>

          {countdown.expired && (
            <button
              className="checkout-retry-button"
              type="button"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              انتخاب دوباره صندلی
            </button>
          )}
        </div>

        <aside className="checkout-summary-card">
          <h2>خلاصه سفارش</h2>
          <span className="sport-label">{ticket.sportLabel}</span>
          <h3>{ticket.homeTeam} - {ticket.awayTeam}</h3>
          <p>{ticket.date}، ساعت {ticket.time}</p>
          <p>{ticket.venue}</p>

          <div className="checkout-summary-lines">
            <div>
              <span>شناسه سفارش</span>
              <strong>{reservation.orderId ?? reservation.id}</strong>
            </div>
            <div>
              <span>نوع رزرو</span>
              <strong>ثبت‌شده در Reservation API</strong>
            </div>
            <div>
              <span>رده بلیط</span>
              <strong>{reservation.category || ticket.category}</strong>
            </div>
            <div>
              <span>صندلی‌ها</span>
              <strong>
                {reservation.selectedSeats?.length
                  ? reservation.selectedSeats
                    .map((seat) => `ردیف ${seat.row}، ${seat.number}`)
                    .join(' | ')
                  : reservation.seatIds?.join('، ') || 'ثبت نشده'}
              </strong>
            </div>
            <div>
              <span>تعداد بلیط</span>
              <strong>{formatNumber(quantity)}</strong>
            </div>
            <div>
              <span>قیمت هر بلیط</span>
              <strong>{formatNumber(unitPrice)} تومان</strong>
            </div>
            <div className="checkout-summary-total">
              <span>مبلغ نهایی</span>
              <strong>{formatNumber(totalPrice)} تومان</strong>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
