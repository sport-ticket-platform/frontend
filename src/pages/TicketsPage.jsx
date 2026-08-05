import { useEffect, useMemo, useState } from 'react';
import { ListFilter, RotateCcw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SearchPanel from '../components/SearchPanel.jsx';
import TicketCard from '../components/TicketCard.jsx';
import Loading from '../components/Loading.jsx';
import { cities as fallbackCities, sports as fallbackSports } from '../data/mockData.js';
import { useAuth } from '../context/AuthContext.jsx';
import { eventService } from '../services/eventService.js';

const emptyFilters = {
  q: '',
  sport: '',
  city: '',
  date: '',
  minPrice: '',
  maxPrice: '',
};

export default function TicketsPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsAsObject = Object.fromEntries(searchParams.entries());
  const [filters, setFilters] = useState({ ...emptyFilters, ...paramsAsObject });
  const [appliedFilters, setAppliedFilters] = useState({ ...emptyFilters, ...paramsAsObject });
  const [sortBy, setSortBy] = useState('soonest');
  const [tickets, setTickets] = useState([]);
  const [metadata, setMetadata] = useState({
    sports: fallbackSports,
    cities: fallbackCities,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    eventService.getMetadata().then((result) => {
      if (active) setMetadata(result);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    eventService.searchMatches(appliedFilters)
      .then((result) => {
        if (active) setTickets(result);
      })
      .catch((requestError) => {
        if (!active) return;

        setTickets([]);
        setError(
          requestError.status === 401
            ? 'برای دریافت مسابقات از سرویس Event ابتدا وارد حساب کاربری شوید.'
            : requestError.message,
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, isAuthenticated]);

  const results = useMemo(() => [...tickets].sort((first, second) => {
    if (sortBy === 'cheapest') return first.price - second.price;
    if (sortBy === 'expensive') return second.price - first.price;
    if (sortBy === 'remaining') return first.remaining - second.remaining;
    return new Date(first.matchTime || first.isoDate) - new Date(second.matchTime || second.isoDate);
  }), [tickets, sortBy]);

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
        </header>

        <div className="filter-panel">
          <div className="filter-panel-title">
            <div>
              <ListFilter size={19} />
              <h2>فیلتر بلیط‌ها</h2>
            </div>
            <button type="button" className="reset-button" onClick={resetFilters} disabled={loading}>
              <RotateCcw size={15} /> پاک کردن
            </button>
          </div>
          <SearchPanel
            filters={filters}
            onChange={setFilters}
            onSubmit={applyFilters}
            sports={metadata.sports}
            cities={metadata.cities}
            disabled={loading}
          />
        </div>

        {error && (
          <div className="form-message error" role="alert">
            <span>{error}</span>
            {!isAuthenticated && (
              <Link className="secondary-button" to="/auth" state={{ from: '/tickets' }}>
                ورود به حساب
              </Link>
            )}
          </div>
        )}

        <div className="results-toolbar">
          <div>
            <strong>{new Intl.NumberFormat('fa-IR').format(results.length)} مسابقه</strong>
            <span>پیدا شد</span>
          </div>
          <label>
            مرتب‌سازی:
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} disabled={loading}>
              <option value="soonest">نزدیک‌ترین زمان</option>
              <option value="cheapest">کمترین قیمت</option>
              <option value="expensive">بیشترین قیمت</option>
              <option value="remaining">ظرفیت محدودتر</option>
            </select>
          </label>
        </div>

        {loading ? (
          <Loading label="در حال دریافت مسابقات از بک‌اند..." />
        ) : results.length > 0 ? (
          <div className="ticket-list">
            {results.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : !error ? (
          <div className="empty-results">
            <h2>بلیطی پیدا نشد</h2>
            <p>فیلترها را تغییر بده یا همه مسابقات را دوباره نمایش بده.</p>
            <button type="button" className="secondary-button" onClick={resetFilters}>
              نمایش همه مسابقات
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
