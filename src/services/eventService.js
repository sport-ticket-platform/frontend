import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';

const unwrap = (payload) => payload?.data ?? payload;

const sportDefinitions = [
  {
    value: 'football',
    label: 'فوتبال',
    aliases: ['football', 'فوتبال'],
    emoji: '⚽',
  },
  {
    value: 'volleyball',
    label: 'والیبال',
    aliases: ['volleyball', 'والیبال'],
    emoji: '🏐',
  },
  {
    value: 'basketball',
    label: 'بسکتبال',
    aliases: ['basketball', 'بسکتبال'],
    emoji: '🏀',
  },
];

let matchCache = [];

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

function selectedSportName(value) {
  return sportDefinitions.find((item) => item.value === value)?.label || null;
}

function parseAmenities(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) return parsed.filter(Boolean);

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name);
    }
  } catch {
    return String(value)
      .split(/[,،|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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

function normalizeConfig(config, seats = []) {
  const configSeats = seats.filter(
    (seat) => Number(seat.configId) === Number(config.configId),
  );
  const availableSeats = configSeats.filter((seat) => !seat.isReserved);

  return {
    id: String(config.configId),
    configId: Number(config.configId),
    matchId: Number(config.matchId),
    categoryId: Number(config.categoryId),
    category: config.categoryName || 'عادی',
    price: Number(config.price || 0),
    totalSeats: Number(config.totalSeats || configSeats.length || 0),
    remaining: configSeats.length
      ? availableSeats.length
      : Number(config.totalSeats || 0),
    amenities: parseAmenities(config.amenities),
    seats: configSeats.map((seat) => ({
      id: String(seat.seatId),
      seatId: Number(seat.seatId),
      configId: Number(seat.configId),
      section: Number(seat.section),
      row: Number(seat.rowNo),
      number: Number(seat.seatNo),
      isReserved: Boolean(seat.isReserved),
    })),
  };
}

function normalizeMatch(match, rawConfigs = [], seats = []) {
  const configs = rawConfigs
    .map((config) => normalizeConfig(config, seats))
    .sort((first, second) => first.price - second.price);
  const cheapestConfig = configs[0];
  const dateParts = formatDateTime(match.matchTime);
  const sport = normalizeSport(match.sportName);
  const remaining = configs.reduce(
    (sum, config) => sum + config.remaining,
    0,
  );

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
    remaining,
    section: cheapestConfig
      ? `رده ${cheapestConfig.category}`
      : 'ثبت نشده',
    row: 'با انتخاب صندلی مشخص می‌شود',
    seat: 'با انتخاب صندلی مشخص می‌شود',
    amenities: cheapestConfig?.amenities || [],
    description: `بلیط مسابقه ${match.hostTeamName || 'تیم میزبان'} و ${match.guestTeamName || 'تیم مهمان'} در ${match.venueName || 'ورزشگاه'}.`,
    configs,
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

function filterNormalizedMatches(matches, filters = {}) {
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

async function getConfigs(matchId) {
  const payload = await apiRequest(
    `${apiConfig.eventBaseUrl}/match/${matchId}/configs`,
  );
  const configs = unwrap(payload);
  return Array.isArray(configs) ? configs : [];
}

async function getSeats(configIds) {
  if (!configIds.length) return [];

  const params = new URLSearchParams();
  configIds.forEach((id) => params.append('ConfigIds', String(id)));

  try {
    const payload = await apiRequest(
      `${apiConfig.eventBaseUrl}/match/configs/seats?${params.toString()}`,
    );
    const seats = unwrap(payload);
    return Array.isArray(seats) ? seats : [];
  } catch {
    return [];
  }
}

async function enrichMatches(matches) {
  return Promise.all(matches.map(async (match) => {
    try {
      const configs = await getConfigs(match.matchId);
      return normalizeMatch(match, configs);
    } catch {
      return normalizeMatch(match);
    }
  }));
}

export const eventService = {
  async searchMatches(filters = {}) {
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

    const matches = Array.isArray(unwrap(payload)) ? unwrap(payload) : [];
    matchCache = matches;
    const normalized = await enrichMatches(matches);
    return filterNormalizedMatches(normalized, filters);
  },

  async getMatchDetails(matchId) {
    const numericMatchId = Number(matchId);

    let match = matchCache.find(
      (item) => Number(item.matchId || item.id) === numericMatchId,
    );

    if (!match) {
      try {
        // First try searching via POST /match
        const payload = await apiRequest(`${apiConfig.eventBaseUrl}/match`, {
          method: 'POST',
          body: JSON.stringify({ limit: 100, offset: 0 }),
        });
        const matches = Array.isArray(unwrap(payload)) ? unwrap(payload) : [];
        matchCache = matches;
        match = matches.find(
          (item) => Number(item.matchId || item.id) === numericMatchId,
        );
      } catch {
        // Fallback to GET /match
        try {
          const fallbackPayload = await apiRequest(
            `${apiConfig.eventBaseUrl}/match?limit=100&offset=0`,
          );
          const fallbackMatches = Array.isArray(unwrap(fallbackPayload))
            ? unwrap(fallbackPayload)
            : [];
          matchCache = fallbackMatches;
          match = fallbackMatches.find(
            (item) => Number(item.matchId || item.id) === numericMatchId,
          );
        } catch {
          // ignore fallback error
        }
      }
    }

    if (!match) return null;

    let configs = [];
    let seats = [];

    try {
      configs = await getConfigs(match.matchId || matchId);
      if (configs.length > 0) {
        seats = await getSeats(
          configs.map((config) => config.configId),
        );
      }
    } catch {
      // If configs or seats fail, still return match details
    }

    return normalizeMatch(match, configs, seats);
  },

  async getMetadata() {
    const [venuesResult, leaguesResult] = await Promise.allSettled([
      apiRequest(`${apiConfig.eventBaseUrl}/venues?limit=40&offset=0`),
      apiRequest(`${apiConfig.eventBaseUrl}/leagues?limit=40&offset=0`),
    ]);

    const venuesPayload = venuesResult.status === 'fulfilled'
      ? unwrap(venuesResult.value)
      : [];
    const leaguesPayload = leaguesResult.status === 'fulfilled'
      ? unwrap(leaguesResult.value)
      : [];
    const venues = Array.isArray(venuesPayload) ? venuesPayload : [];
    const leagues = Array.isArray(leaguesPayload) ? leaguesPayload : [];
    const cities = [
      ...new Set(
        venues.map((venue) => venue.cityName).filter(Boolean),
      ),
    ];
    const sports = [
      ...new Map(leagues.map((league) => {
        const sport = normalizeSport(league.sportName);
        return [
          sport.value,
          {
            value: sport.value,
            label: sport.label,
            emoji: sport.emoji,
          },
        ];
      })).values(),
    ];

    return {
      sports,
      cities,
    };
  },
};
