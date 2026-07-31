import { CalendarDays, Clock3, MapPin, Ticket, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import TeamBadge from './TeamBadge.jsx';

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(value);

export default function TicketCard({ ticket }) {
  return (
    <article className="ticket-card">
      <div className="ticket-card-heading">
        <div>
          <span className="sport-label">{ticket.sportLabel}</span>
          <span className="league-label">{ticket.league}</span>
        </div>
        <span className="ticket-category">{ticket.category}</span>
      </div>

      <div className="ticket-teams">
        <TeamBadge code={ticket.homeCode} name={ticket.homeTeam} />
        <span className="versus">VS</span>
        <TeamBadge code={ticket.awayCode} name={ticket.awayTeam} />
      </div>

      <div className="ticket-information">
        <span><CalendarDays size={16} /> {ticket.date}</span>
        <span><Clock3 size={16} /> {ticket.time}</span>
        <span><MapPin size={16} /> {ticket.venue}</span>
        <span><Users size={16} /> {formatNumber(ticket.remaining)} بلیط باقی مانده</span>
      </div>

      <div className="ticket-card-footer">
        <div className="ticket-price">
          <small>شروع قیمت از</small>
          <strong>{formatNumber(ticket.price)}</strong>
          <span>تومان</span>
        </div>
        <Link className="ticket-detail-link" to={`/tickets/${ticket.id}`}>
          <Ticket size={17} />
          مشاهده جزئیات
        </Link>
      </div>
    </article>
  );
}
