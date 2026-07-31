import { useMemo, useState } from 'react';
import { ListFilter, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SearchPanel from '../components/SearchPanel.jsx';
import TicketCard from '../components/TicketCard.jsx';
import { tickets } from '../data/mockData.js';

const emptyFilters = {
  q: '',
  sport: '',
  city: '',
  date: '',
  minPrice: '',
  maxPrice: '',
};

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsAsObject = Object.fromEntries(searchParams.entries());
  const [filters, setFilters] = useState({ ...emptyFilters, ...paramsAsObject });
  const [appliedFilters, setAppliedFilters] = useState({ ...emptyFilters, ...paramsAsObject });
  const [sortBy, setSortBy] = useState('soonest');

  const results = useMemo(() => {
    const normalizedQuery = appliedFilters.q.trim().toLowerCase();

    const filteredTickets = tickets.filter((ticket) => {
      const searchableText = [
        ticket.homeTeam,
        ticket.awayTeam,
        ticket.league,
        ticket.venue,
      ].join(' ').toLowerCase();

      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesSport = !appliedFilters.sport || ticket.sport === appliedFilters.sport;
      const matchesCity = !appliedFilters.city || ticket.city === appliedFilters.city;
      const matchesDate = !appliedFilters.date || ticket.isoDate === appliedFilters.date;
      const matchesMinPrice = !appliedFilters.minPrice || ticket.price >= Number(appliedFilters.minPrice);
      const matchesMaxPrice = !appliedFilters.maxPrice || ticket.price <= Number(appliedFilters.maxPrice);

      return matchesQuery
        && matchesSport
        && matchesCity
        && matchesDate
        && matchesMinPrice
        && matchesMaxPrice;
    });

    return [...filteredTickets].sort((first, second) => {
      if (sortBy === 'cheapest') return first.price - second.price;
      if (sortBy === 'expensive') return second.price - first.price;
      if (sortBy === 'remaining') return first.remaining - second.remaining;
      return new Date(first.isoDate) - new Date(second.isoDate);
    });
  }, [appliedFilters, sortBy]);

  const applyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);

    const queryParams = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ''),
    );
    setSearchParams(queryParams);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSearchParams({});
  };

  return (
    <section className="tickets-page page-section">
      <div className="container">
        <header className="tickets-page-header">
          <span className="page-label">جستجوی مسابقات</span>
          <h1>بلیط مسابقه موردنظرت را پیدا کن</h1>
          <p>نتایج را براساس نوع ورزش، تیم، شهر، تاریخ و قیمت محدود کن.</p>
        </header>

        <div className="filter-panel">
          <div className="filter-panel-title">
            <div>
              <ListFilter size={19} />
              <h2>فیلتر بلیط‌ها</h2>
            </div>
            <button type="button" className="reset-button" onClick={resetFilters}>
              <RotateCcw size={15} /> پاک کردن
            </button>
          </div>
          <SearchPanel filters={filters} onChange={setFilters} onSubmit={applyFilters} />
        </div>

        <div className="results-toolbar">
          <div>
            <strong>{new Intl.NumberFormat('fa-IR').format(results.length)} مسابقه</strong>
            <span>پیدا شد</span>
          </div>
          <label>
            مرتب‌سازی:
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="soonest">نزدیک‌ترین زمان</option>
              <option value="cheapest">کمترین قیمت</option>
              <option value="expensive">بیشترین قیمت</option>
              <option value="remaining">ظرفیت محدودتر</option>
            </select>
          </label>
        </div>

        {results.length > 0 ? (
          <div className="ticket-list">
            {results.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <h2>بلیطی پیدا نشد</h2>
            <p>فیلترها را تغییر بده یا همه مسابقات را دوباره نمایش بده.</p>
            <button type="button" className="secondary-button" onClick={resetFilters}>
              نمایش همه مسابقات
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
