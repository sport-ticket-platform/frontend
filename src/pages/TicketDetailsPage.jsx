import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Ticket,
  Users,
} from 'lucide-react';
import TeamBadge from '../components/TeamBadge.jsx';
import Loading from '../components/Loading.jsx';
import { ticketService } from '../services/ticketService.js';
import { useAuth } from '../context/AuthContext.jsx';

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value || 0);

export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [reservationMessage, setReservationMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReservationMessage('');

    ticketService.getById(ticketId)
      .then((result) => {
        if (!active) return;

        setTicket(result);
        const firstConfig = result?.configs?.[0] || null;

        setSelectedConfigId(
          firstConfig
            ? String(firstConfig.id || firstConfig.configId)
            : '',
        );
      })
      .catch((error) => {
        if (active) setReservationMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId]);

  const configs = useMemo(() => {
    if (!ticket) return [];

    return ticket.configs?.length ? ticket.configs : [];
  }, [ticket]);

  const selectedConfig = useMemo(() => (
    configs.find(
      (config) => String(config.id || config.configId) === String(selectedConfigId),
    ) || configs[0]
  ), [configs, selectedConfigId]);

  const availableSeats = useMemo(() => (
    selectedConfig?.seats?.filter((seat) => !seat.isReserved) || []
  ), [selectedConfig]);

  const selectedSeats = useMemo(() => availableSeats.filter((seat) => (
    selectedSeatIds.includes(String(seat.id || seat.seatId))
  )), [availableSeats, selectedSeatIds]);

  useEffect(() => {
    setSelectedSeatIds([]);
  }, [selectedConfigId]);

  if (loading) {
    return <Loading label="در حال دریافت جزئیات مسابقه و صندلی‌ها..." />;
  }

  if (!ticket) {
    return (
      <section className="page-section">
        <div className="container simple-message">
          <h1>مسابقه پیدا نشد</h1>
          <Link className="primary-button" to="/tickets">
            بازگشت به مسابقات
          </Link>
        </div>
      </section>
    );
  }

  const quantity = selectedSeats.length;
  const totalPrice = Number(selectedConfig?.price || 0) * quantity;

  const toggleSeat = (seat) => {
    const id = String(seat.id || seat.seatId);
    setReservationMessage('');

    setSelectedSeatIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 4) {
        setReservationMessage('در هر رزرو حداکثر چهار صندلی قابل انتخاب است.');
        return current;
      }

      return [...current, id];
    });
  };

  const continueReservation = async () => {
    if (!isAuthenticated) {
      navigate('/auth', {
        state: {
          from: `/tickets/${ticket.id}`,
          message: 'برای انتخاب و رزرو صندلی ابتدا وارد حساب کاربری شوید.',
        },
      });
      return;
    }

    if (!selectedConfig) {
      setReservationMessage('رده بلیطی برای این مسابقه ثبت نشده است.');
      return;
    }

    if (!selectedSeats.length) {
      setReservationMessage('حداقل یک صندلی آزاد را انتخاب کنید.');
      return;
    }

    setReserving(true);
    setReservationMessage('');

    try {
      await ticketService.reserve(ticket.id, {
        config: selectedConfig,
        selectedSeats,
        seatIds: selectedSeats.map((seat) => Number(seat.seatId)),
      });
      navigate(`/checkout/${ticket.id}`);
    } catch (error) {
      setReservationMessage(error.message);

      if ([400, 409].includes(error.status)) {
        try {
          const refreshedTicket = await ticketService.getById(ticket.id);
          setTicket(refreshedTicket);
          setSelectedSeatIds([]);
        } catch {
          setSelectedSeatIds([]);
        }
      }
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="ticket-details-page">
      <div className="container details-breadcrumb">
        <Link to="/tickets">
          <ArrowRight size={16} />
          بازگشت به مسابقات
        </Link>
      </div>

      <section className="container details-layout">
        <div className="details-main">
          <article className="details-match-card">
            <div className="details-card-heading">
              <div>
                <span className="sport-label">{ticket.sportLabel}</span>
                <span className="league-label">{ticket.league}</span>
              </div>
              <span className="ticket-category">
                {selectedConfig?.category || ticket.category}
              </span>
            </div>

            <div className="details-teams">
              <TeamBadge code={ticket.homeCode} name={ticket.homeTeam} />
              <div className="details-versus">
                <strong>VS</strong>
                <span>{ticket.date}</span>
                <b>{ticket.time}</b>
              </div>
              <TeamBadge code={ticket.awayCode} name={ticket.awayTeam} />
            </div>

            <div className="details-venue">
              <MapPin size={19} />
              <div>
                <strong>{ticket.venue}</strong>
                <span>{ticket.city}</span>
              </div>
            </div>
          </article>

          <article className="details-information-card">
            <h2>اطلاعات مسابقه</h2>
            <p>{ticket.description}</p>

            <div className="details-information-grid">
              <div>
                <CalendarDays size={18} />
                <span>تاریخ مسابقه</span>
                <strong>{ticket.date}</strong>
              </div>
              <div>
                <Clock3 size={18} />
                <span>ساعت شروع</span>
                <strong>{ticket.time}</strong>
              </div>
              <div>
                <MapPin size={18} />
                <span>محل برگزاری</span>
                <strong>{ticket.venue}</strong>
              </div>
              <div>
                <Users size={18} />
                <span>صندلی آزاد این رده</span>
                <strong>{formatNumber(selectedConfig?.remaining)} صندلی</strong>
              </div>
            </div>

            <h3>امکانات این رده</h3>
            <div className="details-amenities">
              {(selectedConfig?.amenities?.length
                ? selectedConfig.amenities
                : ['امکاناتی ثبت نشده است']).map((amenity) => (
                  <span key={amenity}>
                    <Check size={15} />
                    {amenity}
                  </span>
              ))}
            </div>
          </article>

          <article className="details-information-card seat-selection-card">
            <div className="seat-selection-heading">
              <div>
                <h2>انتخاب رده و صندلی</h2>
                <p>
                  صندلی‌های خاکستری قبلاً رزرو شده‌اند. حداکثر چهار صندلی انتخاب کنید.
                </p>
              </div>

              <label>
                رده بلیط
                <select
                  value={selectedConfigId}
                  onChange={(event) => setSelectedConfigId(event.target.value)}
                >
                  {configs.map((config) => (
                    <option
                      key={config.id || config.configId}
                      value={config.id || config.configId}
                    >
                      {config.category} ـ {formatNumber(config.price)} تومان
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedConfig?.seats?.length ? (
              <div className="seat-grid" aria-label="صندلی‌های مسابقه">
                {selectedConfig.seats.map((seat) => {
                  const id = String(seat.id || seat.seatId);
                  const selected = selectedSeatIds.includes(id);

                  return (
                    <button
                      key={id}
                      className={`seat-button${selected ? ' selected' : ''}${seat.isReserved ? ' reserved' : ''}`}
                      type="button"
                      disabled={seat.isReserved}
                      onClick={() => toggleSeat(seat)}
                      title={`بخش ${seat.section}، ردیف ${seat.row}، صندلی ${seat.number}`}
                    >
                      <span>{seat.number}</span>
                      <small>ر{seat.row}</small>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="form-message info">
                برای این رده صندلی‌ای از بک‌اند دریافت نشد.
              </div>
            )}
          </article>
        </div>

        <aside className="details-booking-card">
          <span className="booking-title">خلاصه انتخاب</span>

          <div className="booking-price">
            <small>قیمت هر صندلی</small>
            <strong>{formatNumber(selectedConfig?.price)}</strong>
            <span>تومان</span>
          </div>

          <div className="booking-seat-information">
            <div>
              <span>رده بلیط</span>
              <strong>{selectedConfig?.category || 'ثبت نشده'}</strong>
            </div>
            <div>
              <span>تعداد صندلی</span>
              <strong>{formatNumber(quantity)}</strong>
            </div>
            <div className="selected-seat-summary">
              <span>صندلی‌های انتخابی</span>
              <strong>
                {selectedSeats.length
                  ? selectedSeats
                    .map((seat) => `ردیف ${seat.row}، شماره ${seat.number}`)
                    .join(' | ')
                  : 'هنوز انتخاب نشده'}
              </strong>
            </div>
          </div>

          <div className="booking-total">
            <span>مبلغ کل</span>
            <strong>{formatNumber(totalPrice)} تومان</strong>
          </div>

          <button
            className="booking-button"
            type="button"
            onClick={continueReservation}
            disabled={reserving || !selectedSeats.length}
          >
            <Ticket size={18} />
            {reserving
              ? 'در حال ثبت رزرو...'
              : 'رزرو صندلی‌های انتخابی'}
          </button>
          {reservationMessage && (
            <div className="form-message info booking-message" role="status">
              {reservationMessage}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
