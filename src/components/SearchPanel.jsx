import { Search } from 'lucide-react';
import { cities, sports } from '../data/mockData.js';

export default function SearchPanel({ filters, onChange, onSubmit }) {
  const updateField = (event) => {
    onChange({
      ...filters,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <form className="ticket-search-form" onSubmit={onSubmit}>
      <div className="field field-wide">
        <label htmlFor="q">تیم، لیگ یا ورزشگاه</label>
        <div className="input-with-icon">
          <Search size={17} />
          <input
            id="q"
            name="q"
            value={filters.q}
            onChange={updateField}
            placeholder="مثلاً پرسپولیس یا آزادی"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="sport">نوع ورزش</label>
        <select id="sport" name="sport" value={filters.sport} onChange={updateField}>
          <option value="">همه ورزش‌ها</option>
          {sports.map((sport) => (
            <option key={sport.value} value={sport.value}>
              {sport.emoji} {sport.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="city">شهر</label>
        <select id="city" name="city" value={filters.city} onChange={updateField}>
          <option value="">همه شهرها</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="date">تاریخ مسابقه</label>
        <input id="date" name="date" type="date" value={filters.date} onChange={updateField} />
      </div>

      <div className="field">
        <label htmlFor="minPrice">حداقل قیمت</label>
        <input
          id="minPrice"
          name="minPrice"
          type="number"
          min="0"
          value={filters.minPrice}
          onChange={updateField}
          placeholder="مثلاً ۳۰۰۰۰۰"
        />
      </div>

      <div className="field">
        <label htmlFor="maxPrice">حداکثر قیمت</label>
        <input
          id="maxPrice"
          name="maxPrice"
          type="number"
          min="0"
          value={filters.maxPrice}
          onChange={updateField}
          placeholder="مثلاً ۱۵۰۰۰۰۰"
        />
      </div>

      <button className="primary-button search-button" type="submit">
        جستجوی بلیط
      </button>
    </form>
  );
}
