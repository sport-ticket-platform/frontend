import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';
import { cities as mockCities, sports as mockSports, tickets as mockTickets } from '../data/mockData.js';

const unwrap = (payload) => payload?.data ?? payload;

const sportDefinitions = [
  { value: 'football', label: 'فوتبال', aliases: ['football', 'فوتبال'], emoji: '⚽' },
  { value: 'volleyball', label: 'والیبال', aliases: ['volleyball', 'والیبال'], emoji: '🏐' },
  { value: 'basketball', label: 'بسکتبال', aliases: ['basketball', 'بسکتبال'], emoji: '🏀' },
];

function teamCode(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '--';

  const latin = words.join('').replace(/[^A-Za-z0-9]/g, '');
  if (latin) return latin.slice(0, 2).toUpperCase();

  return words.slice(0, 2).map((word) => word[0]).join('');
}

function normalizeSport(name = '') {
  const normalized = String(name).trim().toLowerCase();
  const definition = sportDefinitions.find((item) => (
    item.aliases.some((alias) => normalized.includes(alias.toLowerCase()))
  ));

  return definition || {
    value: normalized || 'other',
    label: name || 'ورزش',
    emoji: '🎟️',
  };
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: 'ثبت نشده',
      time: '--:--',
      isoDate: '',
    };
  }

  return {
    date: new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
    time: new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date),
    isoDate: date.toISOString().slice(0, 10),
  };
}

function normalizeMatch(match, configs = []) {
  const normalizedConfigs = configs
    .map((config) => ({
      configId: Number(config.configId),
      category: config.categoryName || 'عادی',
      price: Number(config.price || 0),
      totalSeats: Number(config.totalSeats || 0),
    }))
    .sort((first, second) => first.price - second.price);

  const cheapestConfig = normalizedConfigs[0];
  const dateParts = formatDateTime(match.matchTime);
  const sport = normalizeSport(match.sportName);
  const totalSeats = normalizedConfigs.reduce((sum, config) => sum + config.totalSeats, 0);

  return {
    id: String(match.matchId),
    matchId: Number(match.matchId),
    sport: sport.value,
    sportLabel: sport.label,
    league: match.leagueName || 'بدون لیگ',
    leagueId: Number(match.leagueId || 0),
    homeTeam: match.hostTeamName || 'تیم میزبان',
    awayTeam: match.guestTeamName || 'تیم مهمان',
    homeCode: teamCode(match.hostTeamName),
    awayCode: teamCode(match.guestTeamName),
    city: match.venueCityName || '',
    cityId: Number(match.venueCityId || 0),
    venue: match.venueName || 'ورزشگاه ثبت نشده',
    venueId: Number(match.venueId || 0),
    matchTime: match.matchTime,
    ...dateParts,
    category: cheapestConfig?.category || 'در حال تکمیل',
    price: cheapestConfig?.price || 0,
    remaining: totalSeats,
    availabilityLabel: 'ظرفیت تعریف‌شده',
  };
}

function buildDateRange(dateValue) {
  if (!dateValue) return {};

  const from = new Date(`${dateValue}T00:00:00`);
  const to = new Date(`${dateValue}T23:59:59.999`);

  return {
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
  };
}

function filterMatches(matches, filters = {}) {
  const query = String(filters.q || '').trim().toLowerCase();
  const minPrice = filters.minPrice === '' || filters.minPrice == null
    ? null
    : Number(filters.minPrice);
  const maxPrice = filters.maxPrice === '' || filters.maxPrice == null
    ? null
    : Number(filters.maxPrice);

  return matches.filter((match) => {
    const searchable = [
      match.homeTeam,
      match.awayTeam,
      match.league,
      match.venue,
    ].join(' ').toLowerCase();

    return (!query || searchable.includes(query))
      && (!filters.sport || match.sport === filters.sport)
      && (!filters.city || match.city === filters.city)
      && (!filters.date || match.isoDate === filters.date)
      && (minPrice == null || match.price >= minPrice)
      && (maxPrice == null || match.price <= maxPrice);
  });
}

async function getMatchConfigs(matchId) {
  const payload = await apiRequest(`${apiConfig.eventBaseUrl}/match/${matchId}/configs`);
  const configs = unwrap(payload);
  return Array.isArray(configs) ? configs : [];
}

async function normalizeMatches(matches) {
  return Promise.all(matches.map(async (match) => {
    try {
      const configs = await getMatchConfigs(match.matchId);
      return normalizeMatch(match, configs);
    } catch {
      return normalizeMatch(match);
    }
  }));
}

function selectedSportName(value) {
  return sportDefinitions.find((item) => item.value === value)?.label || null;
}

export const eventService = {
  async searchMatches(filters = {}) {
    if (apiConfig.eventMocks) {
      return filterMatches(mockTickets, filters);
    }

    const payload = await apiRequest(`${apiConfig.eventBaseUrl}/match`, {
      method: 'POST',
      body: JSON.stringify({
        sportName: selectedSportName(filters.sport),
        cityName: filters.city || null,
        ...buildDateRange(filters.date),
        limit: 40,
        offset: 0,
      }),
    });

    const matches = unwrap(payload);
    const normalized = await normalizeMatches(Array.isArray(matches) ? matches : []);
    return filterMatches(normalized, filters);
  },

  async getMetadata() {
    if (apiConfig.eventMocks) {
      return {
        sports: mockSports,
        cities: mockCities,
      };
    }

    const [venuesResult, leaguesResult] = await Promise.allSettled([
      apiRequest(`${apiConfig.eventBaseUrl}/venues?limit=40&offset=0`),
      apiRequest(`${apiConfig.eventBaseUrl}/leagues?limit=40&offset=0`),
    ]);

    const venuesPayload = venuesResult.status === 'fulfilled' ? unwrap(venuesResult.value) : [];
    const leaguesPayload = leaguesResult.status === 'fulfilled' ? unwrap(leaguesResult.value) : [];
    const venues = Array.isArray(venuesPayload) ? venuesPayload : [];
    const leagues = Array.isArray(leaguesPayload) ? leaguesPayload : [];
    const cities = [...new Set(venues.map((venue) => venue.cityName).filter(Boolean))];
    const sports = [...new Map(leagues.map((league) => {
      const sport = normalizeSport(league.sportName);
      return [sport.value, {
        value: sport.value,
        label: sport.label,
        emoji: sport.emoji,
      }];
    })).values()];

    return {
      sports: sports.length ? sports : mockSports,
      cities: cities.length ? cities : mockCities,
    };
  },
};
