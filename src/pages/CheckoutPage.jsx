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

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value);

export default function CheckoutPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_card');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const countdown = useCountdown(reservation?.expiresAt);

  useEffect(() => {
    let active = true;

    const prepareCheckout = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const selectedTicket = await ticketService.getById(ticketId);
        if (!selectedTicket) throw new Error('بلیط انتخاب‌شده پیدا نشد.');

        let currentReservation = storage.get('activeReservation');
        const invalidReservation = !currentReservation
          || currentReservation.ticketId !== ticketId
          || new Date(currentReservation.expiresAt).getTime() <= Date.now();

        if (invalidReservation) {
          currentReservation = await ticketService.reserve(ticketId, 1);
        }

        if (active) {
          setTicket(selectedTicket);
          setReservation(currentReservation);
        }
      } catch (error) {
        if (active) setMessage({ type: 'error', text: error.message });
      } finally {
        if (active) setLoading(false);
      }
    };

    prepareCheckout();
    return () => {
      active = false;
    };
  }, [ticketId]);

  const quantity = reservation?.quantity || 1;
  const totalPrice = useMemo(
    () => (ticket?.price || 0) * quantity,
    [ticket, quantity],
  );

  const submitPayment = async () => {
    if (!reservation) return;

    if (countdown.expired) {
      setMessage({
        type: 'error',
        text: 'زمان رزرو تمام شده است. دوباره بلیط را رزرو کنید.',
      });
      return;
    }

    setPaying(true);
    setMessage(null);

    try {
      const result = await ticketService.pay(reservation.id, paymentMethod);
      setPaymentResult(result);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loading label="در حال آماده‌سازی صفحه پرداخت..." />;

  if (!ticket || !reservation) {
    return (
      <section className="page-section">
        <div className="container simple-message">
          <h1>امکان ادامه پرداخت وجود ندارد</h1>
          <p>{message?.text || 'اطلاعات رزرو در دسترس نیست.'}</p>
          <Link className="primary-button" to="/tickets">
            بازگشت به مسابقات
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
            بلیط مسابقه <strong>{ticket.homeTeam} - {ticket.awayTeam}</strong> با موفقیت ثبت شد.
          </p>
          <div className="tracking-code">
            <span>کد پیگیری</span>
            <strong>{paymentResult.trackingCode}</strong>
          </div>
          <div className="payment-success-actions">
            <Link className="primary-button" to="/tickets">
              خرید بلیط دیگر
            </Link>
            <Link className="secondary-button" to="/">
              بازگشت به صفحه اصلی
            </Link>
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
              <h1>انتخاب روش پرداخت</h1>
            </div>
            <div className={`reservation-countdown${countdown.seconds < 120 ? ' warning' : ''}`}>
              <Clock3 size={19} />
              <span>زمان باقی‌مانده</span>
              <strong>{countdown.formatted}</strong>
            </div>
          </div>

          <div className="payment-method-list">
            <label className={paymentMethod === 'bank_card' ? 'selected' : ''}>
              <input
                type="radio"
                name="paymentMethod"
                value="bank_card"
                checked={paymentMethod === 'bank_card'}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
              <span>
                <strong>کارت بانکی</strong>
                <small>پرداخت از درگاه محلی</small>
              </span>
            </label>

            <label className={paymentMethod === 'wallet' ? 'selected' : ''}>
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
              <span>
                <strong>کیف پول</strong>
                <small>پرداخت از موجودی حساب</small>
              </span>
            </label>

            <label className={paymentMethod === 'local_gateway' ? 'selected' : ''}>
              <input
                type="radio"
                name="paymentMethod"
                value="local_gateway"
                checked={paymentMethod === 'local_gateway'}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
              <span>
                <strong>درگاه محلی</strong>
                <small>بدون اتصال به شبکه بانکی واقعی</small>
              </span>
            </label>
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
              ? 'زمان رزرو پایان یافته است'
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
              رزرو دوباره بلیط
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
              <span>رده و جایگاه</span>
              <strong>{ticket.category}، {ticket.section}</strong>
            </div>
            <div>
              <span>تعداد بلیط</span>
              <strong>{formatNumber(quantity)}</strong>
            </div>
            <div>
              <span>قیمت هر بلیط</span>
              <strong>{formatNumber(ticket.price)} تومان</strong>
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
