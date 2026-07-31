import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import TeamBadge from '../components/TeamBadge.jsx';
import { tickets } from '../data/mockData.js';

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value);

export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  const ticket = useMemo(
    () => tickets.find((item) => item.id === ticketId),
    [ticketId],
  );

  if (!ticket) {
    return (
      <section className="page-section">
        <div className="container simple-message">
          <h1>بلیط پیدا نشد</h1>
          <p>شناسه بلیط واردشده در فهرست مسابقات موجود نیست.</p>
          <Link className="primary-button" to="/tickets">
            بازگشت به مسابقات
          </Link>
        </div>
      </section>
    );
  }

  const totalPrice = ticket.price * quantity;

  const continueReservation = () => {
    navigate('/auth', {
      state: {
        from: `/tickets/${ticket.id}`,
        ticketId: ticket.id,
        quantity,
      },
    });
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
              <span className="ticket-category">{ticket.category}</span>
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
            <h2>اطلاعات مسابقه و جایگاه</h2>
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
                <span>ظرفیت باقی‌مانده</span>
                <strong>{formatNumber(ticket.remaining)} بلیط</strong>
              </div>
            </div>

            <h3>امکانات این جایگاه</h3>
            <div className="details-amenities">
              {ticket.amenities.map((amenity) => (
                <span key={amenity}>
                  <Check size={15} />
                  {amenity}
                </span>
              ))}
            </div>
          </article>
        </div>

        <aside className="details-booking-card">
          <span className="booking-title">خلاصه انتخاب</span>

          <div className="booking-price">
            <small>قیمت هر بلیط</small>
            <strong>{formatNumber(ticket.price)}</strong>
            <span>تومان</span>
          </div>

          <div className="booking-seat-information">
            <div>
              <span>رده بلیط</span>
              <strong>{ticket.category}</strong>
            </div>
            <div>
              <span>جایگاه</span>
              <strong>{ticket.section}</strong>
            </div>
            <div>
              <span>ردیف</span>
              <strong>{ticket.row}</strong>
            </div>
            <div>
              <span>شماره صندلی</span>
              <strong>{ticket.seat}</strong>
            </div>
          </div>

          <label className="booking-quantity">
            <span>تعداد بلیط</span>
            <select
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            >
              {[1, 2, 3, 4].filter((item) => item <= ticket.remaining).map((item) => (
                <option key={item} value={item}>
                  {formatNumber(item)}
                </option>
              ))}
            </select>
          </label>

          <div className="booking-total">
            <span>مبلغ کل</span>
            <strong>{formatNumber(totalPrice)} تومان</strong>
          </div>

          <button
            className="booking-button"
            type="button"
            onClick={continueReservation}
          >
            <Ticket size={18} />
            ادامه فرایند رزرو
          </button>

          <p className="booking-note">
            برای ثبت رزرو باید وارد حساب کاربری شوید. فرم واقعی ورود در کامیت بعدی اضافه می‌شود.
          </p>
        </aside>
      </section>
    </div>
  );
}
