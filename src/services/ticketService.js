import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';
import { eventService } from './eventService.js';

const unwrap = (payload) => payload?.data || payload;

const reportTypeByCategory = {
  payment: 'PAYMENT_ISSUE',
  ticket_info: 'OTHER',
  seat: 'RESERVATION_ISSUE',
  schedule: 'OTHER',
  unexpected_cancel: 'CANCEL_RESERVATION',
  other: 'OTHER',
};

const reportStatusLabels = {
  OPEN: 'در انتظار بررسی',
  IN_PROGRESS: 'در حال بررسی',
  CLOSED: 'رسیدگی‌شده',
};

const reportCategoryByType = {
  PAYMENT_ISSUE: 'payment',
  RESERVATION_ISSUE: 'seat',
  CANCEL_RESERVATION: 'unexpected_cancel',
  TECHNICAL_BUG: 'ticket_info',
  COMPLAINT: 'other',
  OTHER: 'other',
};

function normalizeUserReport(report) {
  return {
    id: String(report.reportId),
    reportId: Number(report.reportId),
    status: report.status,
    statusLabel: reportStatusLabels[report.status] || report.status,
    createdAt: report.reportedAt,
    category: reportCategoryByType[report.type] || 'other',
    description: report.request || 'جزئیات گزارش در نمای فهرست ارائه نشده است.',
    response: report.response || null,
    respondedAt: report.respondedAt || null,
  };
}

function normalizeSelection(ticket, selection) {
  if (typeof selection === 'number') {
    const config = ticket.configs?.[0];
    const availableSeats = config?.seats?.filter((seat) => !seat.isReserved) || [];
    const selectedSeats = availableSeats.slice(0, selection);

    return {
      config,
      selectedSeats,
      seatIds: selectedSeats.map((seat) => Number(seat.seatId)),
      quantity: selectedSeats.length,
    };
  }

  const selectedSeats = Array.isArray(selection?.selectedSeats)
    ? selection.selectedSeats
    : [];
  const seatIds = Array.isArray(selection?.seatIds)
    ? selection.seatIds
    : selectedSeats.map((seat) => seat.seatId);

  return {
    config: selection?.config || ticket.configs?.[0],
    selectedSeats,
    seatIds: seatIds.map(Number).filter(Number.isFinite),
    quantity: seatIds.length,
  };
}

function createStoredReservation(ticket, selected, data) {
  const unitPrice = Number(selected.config?.price || ticket.price || 0);
  const orderId = data?.order_id ?? data?.orderId ?? null;
  const expiresAt = data?.expires_at
    || data?.expiresAt
    || new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const id = orderId === null
    ? `rs-${Date.now()}`
    : String(orderId);

  return {
    id,
    orderId,
    reservationId: data?.reservation_id ?? data?.reservationId ?? null,
    ticketId: String(ticket.id),
    matchId: Number(ticket.matchId || ticket.id),
    configId: selected.config?.configId || null,
    category: selected.config?.category || ticket.category,
    seatIds: selected.seatIds,
    selectedSeats: selected.selectedSeats,
    quantity: selected.quantity,
    unitPrice,
    amount: unitPrice * selected.quantity,
    status: 'reserved',
    statusLabel: 'رزروشده',
    reservationSource: 'backend',
    createdAt: new Date().toISOString(),
    expiresAt,
    ticket,
  };
}

function normalizeOrderDetail(payload, ticket = null) {
  const detail = unwrap(payload) || {};
  const order = detail.order || detail;
  const seats = detail.sold_seats || detail.reservation_seats || [];

  return {
    id: String(order.order_id),
    orderId: Number(order.order_id),
    reservationId: Number(order.reservation_id),
    matchId: Number(detail.match_id || 0),
    amount: Number(order.total_amount || 0),
    quantity: seats.length || 1,
    selectedSeats: seats.map((seat) => ({
      id: String(seat.seat_id),
      seatId: Number(seat.seat_id),
      section: Number(seat.section || 0),
      row: Number(seat.row_no || 0),
      number: Number(seat.seat_no || 0),
    })),
    status: String(order.status || '').toLowerCase(),
    statusLabel: order.status === 'PAID' ? 'پرداخت‌شده' : order.status,
    paidAt: order.created_at,
    createdAt: order.created_at,
    ticket,
  };
}

async function fetchOrderDetail(orderId) {
  const payload = await apiRequest(`${apiConfig.reservationBaseUrl}/order/${orderId}`);
  const detail = unwrap(payload) || {};
  const matchId = detail.match_id;
  const ticket = matchId ? await eventService.getMatchDetails(matchId).catch(() => null) : null;
  return normalizeOrderDetail(detail, ticket);
}

function normalizeReservationDetail(payload, ticket = null) {
  const detail = unwrap(payload) || {};
  const reservation = detail.reservation || detail;
  const seats = detail.reservation_seats || [];
  const status = String(reservation.status || '').toLowerCase();
  const statusLabels = {
    active: 'در انتظار پرداخت',
    expired: 'منقضی‌شده',
    completed: 'تکمیل‌شده',
    cancelled: 'لغوشده',
  };

  return {
    id: `reservation-${reservation.reservation_id}`,
    reservationId: Number(reservation.reservation_id),
    orderId: detail.order_id ? Number(detail.order_id) : null,
    matchId: Number(detail.match_id || 0),
    quantity: seats.length || 1,
    selectedSeats: seats.map((seat) => ({
      id: String(seat.seat_id),
      seatId: Number(seat.seat_id),
      section: Number(seat.section || 0),
      row: Number(seat.row_no || 0),
      number: Number(seat.seat_no || 0),
    })),
    status,
    statusLabel: statusLabels[status] || reservation.status,
    createdAt: reservation.created_at,
    expiresAt: reservation.expires_at,
    canCancel: false,
    reservationSource: 'backend',
    ticket,
  };
}

async function fetchReservationDetail(reservationId) {
  const payload = await apiRequest(
    `${apiConfig.reservationBaseUrl}/reserve/${reservationId}`,
  );
  const detail = unwrap(payload) || {};
  const matchId = detail.match_id;
  const ticket = matchId ? await eventService.getMatchDetails(matchId).catch(() => null) : null;
  return normalizeReservationDetail(detail, ticket);
}

export const ticketService = {
  async getById(ticketId) {
    return eventService.getMatchDetails(ticketId);
  },

  async reserve(ticketId, selection = 1) {
    const ticket = await eventService.getMatchDetails(ticketId);

    if (!ticket) {
      throw new Error('مسابقه انتخاب‌شده پیدا نشد.');
    }

    const selected = normalizeSelection(ticket, selection);
    const uniqueSeatIds = [...new Set(selected.seatIds)];

    if (selected.quantity < 1) {
      throw new Error('حداقل یک صندلی آزاد را انتخاب کنید.');
    }

    if (selected.quantity > 4) {
      throw new Error('در هر رزرو حداکثر چهار صندلی قابل انتخاب است.');
    }

    if (uniqueSeatIds.length !== selected.quantity) {
      throw new Error('در انتخاب شما شناسه صندلی تکراری یا نامعتبر وجود دارد.');
    }

    if (uniqueSeatIds.some((seatId) => !Number.isInteger(seatId) || seatId < 1)) {
      throw new Error('شناسه یکی از صندلی‌های انتخاب‌شده معتبر نیست.');
    }

    if (selected.selectedSeats.some((seat) => seat.isReserved)) {
      throw new Error('یکی از صندلی‌های انتخاب‌شده قبلاً رزرو شده است.');
    }

    const payload = await apiRequest(`${apiConfig.reservationBaseUrl}/reserve`, {
      method: 'POST',
      body: JSON.stringify({ seat_ids: uniqueSeatIds }),
    });
    const data = unwrap(payload);

    const orderId = data?.order_id ?? data?.orderId;
    const expiresAt = data?.expires_at || data?.expiresAt;

    if (orderId === null || orderId === undefined || String(orderId).trim() === '') {
      throw new Error('شناسه سفارش از سرویس رزرو دریافت نشد.');
    }

    if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
      throw new Error('زمان انقضای معتبر از سرویس رزرو دریافت نشد.');
    }

    const reservation = createStoredReservation(
      ticket,
      { ...selected, seatIds: uniqueSeatIds },
      data,
    );

    storage.set('activeReservation', reservation);
    return reservation;
  },

  async pay(reservationId) {
    const payload = await apiRequest(`${apiConfig.reservationBaseUrl}/payment/request`, {
      method: 'POST',
      body: JSON.stringify({ order_id: Number(reservationId) }),
    });
    const payment = unwrap(payload) || {};
    if (!payment.token) throw new Error('توکن پرداخت از سرور دریافت نشد.');

    const gatewayPayload = await apiRequest(
      `${apiConfig.reservationBaseUrl}/mock-gateway/info/${payment.token}`,
    );

    return {
      token: payment.token,
      gatewayInfo: unwrap(gatewayPayload) || {},
    };
  },

  async completePayment(token, status) {
    const payload = await apiRequest(`${apiConfig.reservationBaseUrl}/payment/callback`, {
      method: 'POST',
      body: JSON.stringify({ token, status }),
    });
    return unwrap(payload) || {};
  },

  async getBookings() {
    const [orderPayload, reservationPayload] = await Promise.all([
      apiRequest(`${apiConfig.reservationBaseUrl}/order/history?page=0&page_size=50`),
      apiRequest(`${apiConfig.reservationBaseUrl}/reserve/history?page=0&page_size=50`),
    ]);
    const orderPage = unwrap(orderPayload) || {};
    const reservationPage = unwrap(reservationPayload) || {};
    const orders = Array.isArray(orderPage.data) ? orderPage.data : [];
    const reservations = Array.isArray(reservationPage.data) ? reservationPage.data : [];
    const orderedReservationIds = new Set(orders.map((order) => Number(order.reservation_id)));
    const standaloneReservations = reservations.filter(
      (reservation) => !orderedReservationIds.has(Number(reservation.reservation_id)),
    );

    const [orderItems, reservationItems] = await Promise.all([
      Promise.all(orders.map((order) => fetchOrderDetail(order.order_id))),
      Promise.all(standaloneReservations.map(
        (reservation) => fetchReservationDetail(reservation.reservation_id),
      )),
    ]);

    return [...orderItems, ...reservationItems].sort(
      (first, second) => new Date(second.createdAt) - new Date(first.createdAt),
    );
  },

  async getBookingById(bookingId) {
    const value = String(bookingId);
    if (value.startsWith('reservation-')) {
      return fetchReservationDetail(value.replace('reservation-', ''));
    }
    return fetchOrderDetail(bookingId);
  },

  async submitReport({ bookingId, category, description }) {
    const requestContent = `رزرو ${bookingId}: ${description}`.slice(0, 500);
    const payload = await apiRequest(`${apiConfig.userBaseUrl}/report`, {
      method: 'POST',
      body: JSON.stringify({
        requestConent: requestContent,
        type: reportTypeByCategory[category] || 'OTHER',
      }),
    });
    const reportId = unwrap(payload);
    return {
      id: String(reportId),
      reportId: Number(reportId),
      bookingId,
      category,
      description,
      status: 'OPEN',
      statusLabel: reportStatusLabels.OPEN,
      createdAt: new Date().toISOString(),
    };
  },

  async getReservationHistory(page = 0, pageSize = 10, status = null) {
    let url = `${apiConfig.reservationBaseUrl}/reserve/history?page=${page}&page_size=${pageSize}`;
    if (status) url += `&status=${status}`;
    const payload = await apiRequest(url);
    const result = unwrap(payload) || {};
    return {
      items: Array.isArray(result.data) ? result.data : [],
      currentPage: result.current_page ?? 0,
      pageSize: result.page_size ?? pageSize,
      totalElements: result.total_elements ?? 0,
      totalPages: result.total_pages ?? 1,
      isFirst: result.is_first ?? true,
      isLast: result.is_last ?? true,
    };
  },

  async getReservationCounts() {
    const statuses = ['ACTIVE', 'EXPIRED', 'COMPLETED', 'CANCELLED'];
    const results = await Promise.all(
      statuses.map((status) =>
        apiRequest(
          `${apiConfig.reservationBaseUrl}/reserve/history?page=0&page_size=1&status=${status}`,
        )
          .then((payload) => {
            const result = unwrap(payload) || {};
            return { status, count: result.total_elements ?? 0 };
          })
          .catch(() => ({ status, count: 0 })),
      ),
    );
    const counts = {};
    let total = 0;
    for (const { status, count } of results) {
      counts[status] = count;
      total += count;
    }
    counts.ALL = total;
    return counts;
  },

  async getReservationById(reservationId) {
    const payload = await apiRequest(
      `${apiConfig.reservationBaseUrl}/reserve/${reservationId}`,
    );
    return unwrap(payload) || {};
  },

  async cancelReservation(reservationId) {
    const payload = await apiRequest(
      `${apiConfig.reservationBaseUrl}/reserve/${reservationId}/cancel`,
      { method: 'PUT' },
    );
    return unwrap(payload);
  },

  async getReports() {
    const payload = await apiRequest(`${apiConfig.userBaseUrl}/report`);
    const reports = unwrap(payload);
    if (!Array.isArray(reports)) return [];
    return Promise.all(reports.map(async (report) => {
      try {
        const detail = await apiRequest(`${apiConfig.userBaseUrl}/report/${report.reportId}`);
        return normalizeUserReport(unwrap(detail));
      } catch {
        return normalizeUserReport(report);
      }
    }));
  },
};
