import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';
import { eventService } from './eventService.js';
import { tickets as mockTickets } from '../data/mockData.js';

const delay = (milliseconds = 250) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const unwrap = (payload) => payload?.data || payload;

function getMockTicket(ticketId) {
  return mockTickets.find((ticket) => String(ticket.id) === String(ticketId)) || null;
}

function normalizeDigits(value = '') {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
}

function getEventDate(ticket) {
  if (!ticket?.isoDate) return null;
  const time = normalizeDigits(ticket.time || '00:00');
  const date = new Date(`${ticket.isoDate}T${time}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function findStoredBooking(bookingId) {
  const reservations = storage.get('reservations', []);
  return reservations.find((item) => item.id === bookingId) || null;
}

function enrichBooking(booking) {
  if (!booking) return null;
  const sourceTicket = getMockTicket(booking.ticketId || booking.ticket?.id);
  return {
    ...booking,
    ticket: {
      ...(sourceTicket || {}),
      ...(booking.ticket || {}),
    },
  };
}

function calculatePenalty(booking) {
  const completeBooking = enrichBooking(booking);
  const eventDate = getEventDate(completeBooking?.ticket);
  const amount = Number(completeBooking?.amount || 0);

  if (!eventDate) {
    return {
      canCancel: true,
      penaltyPercent: 20,
      penaltyAmount: Math.round(amount * 0.2),
      refundAmount: Math.round(amount * 0.8),
      ruleLabel: 'جریمه پیش‌فرض نسخه آزمایشی',
    };
  }

  const remainingHours = (eventDate.getTime() - Date.now()) / (60 * 60 * 1000);

  if (remainingHours <= 0) {
    return {
      canCancel: false,
      penaltyPercent: 100,
      penaltyAmount: amount,
      refundAmount: 0,
      ruleLabel: 'پس از شروع مسابقه امکان کنسلی وجود ندارد.',
    };
  }

  let penaltyPercent = 10;
  let ruleLabel = 'بیش از ۷۲ ساعت تا شروع مسابقه';

  if (remainingHours <= 24) {
    penaltyPercent = 50;
    ruleLabel = 'کمتر از ۲۴ ساعت تا شروع مسابقه';
  } else if (remainingHours <= 72) {
    penaltyPercent = 30;
    ruleLabel = 'بین ۲۴ تا ۷۲ ساعت تا شروع مسابقه';
  }

  const penaltyAmount = Math.round((amount * penaltyPercent) / 100);
  return {
    canCancel: true,
    penaltyPercent,
    penaltyAmount,
    refundAmount: Math.max(amount - penaltyAmount, 0),
    ruleLabel,
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

function createStoredReservation(ticket, selected, data = null, source = 'mock') {
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
    statusLabel: source === 'backend' ? 'رزروشده در بک‌اند' : 'رزروشده آزمایشی',
    reservationSource: source,
    createdAt: new Date().toISOString(),
    expiresAt,
    ticket,
  };
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

    if (apiConfig.reservationMocks) {
      await delay();
      const reservation = createStoredReservation(ticket, selected);
      storage.set('activeReservation', reservation);
      return reservation;
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
      'backend',
    );

    storage.set('activeReservation', reservation);
    return reservation;
  },

  async pay(reservationId, paymentMethod = 'bank_card') {
    if (!apiConfig.ticketMocks) {
      const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/payments`, {
        method: 'POST',
        body: JSON.stringify({ reservationId, paymentMethod }),
      });
      return unwrap(payload);
    }

    await delay(450);
    const reservation = storage.get('activeReservation');

    if (!reservation || String(reservation.id) !== String(reservationId)) {
      throw new Error('رزرو فعال پیدا نشد. دوباره صندلی‌ها را انتخاب کنید.');
    }

    if (new Date(reservation.expiresAt).getTime() <= Date.now()) {
      storage.remove('activeReservation');
      throw new Error('مهلت پرداخت رزرو به پایان رسیده است.');
    }

    const paidReservation = {
      ...reservation,
      status: 'paid',
      statusLabel: 'پرداخت‌شده',
      paymentMethod,
      paidAt: new Date().toISOString(),
      amount: Number(reservation.amount || 0),
    };

    const previousReservations = storage.get('reservations', []);
    storage.set('reservations', [paidReservation, ...previousReservations]);
    storage.remove('activeReservation');

    return {
      success: true,
      trackingCode: `SP${Date.now().toString().slice(-9)}`,
      reservation: paidReservation,
    };
  },

  async getBookings() {
    if (apiConfig.ticketMocks) {
      await delay(180);
      return storage.get('reservations', []).map(enrichBooking);
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/bookings`);
    return unwrap(payload);
  },

  async getBookingById(bookingId) {
    if (apiConfig.ticketMocks) {
      await delay(140);
      return enrichBooking(findStoredBooking(bookingId));
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/bookings/${bookingId}`);
    return unwrap(payload);
  },

  async getCancellationPenalty(bookingId) {
    if (apiConfig.ticketMocks) {
      await delay(180);
      const booking = findStoredBooking(bookingId);
      if (!booking) throw new Error('رزرو موردنظر پیدا نشد.');
      if (booking.status === 'cancelled') throw new Error('این بلیط قبلاً کنسل شده است.');
      return calculatePenalty(booking);
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/bookings/${bookingId}/cancellation-penalty`);
    return unwrap(payload);
  },

  async cancelBooking(bookingId, reason = '') {
    if (apiConfig.ticketMocks) {
      await delay(420);
      const reservations = storage.get('reservations', []);
      const index = reservations.findIndex((item) => item.id === bookingId);

      if (index === -1) throw new Error('رزرو موردنظر پیدا نشد.');
      if (reservations[index].status === 'cancelled') throw new Error('این بلیط قبلاً کنسل شده است.');

      const penalty = calculatePenalty(reservations[index]);
      if (!penalty.canCancel) throw new Error(penalty.ruleLabel);

      const cancelledBooking = {
        ...reservations[index],
        status: 'cancelled',
        statusLabel: 'کنسل‌شده',
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
        penaltyPercent: penalty.penaltyPercent,
        penaltyAmount: penalty.penaltyAmount,
        refundAmount: penalty.refundAmount,
        refundStatus: 'پرداخت به کیف پول آزمایشی',
      };

      const updatedReservations = [...reservations];
      updatedReservations[index] = cancelledBooking;
      storage.set('reservations', updatedReservations);

      return enrichBooking(cancelledBooking);
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return unwrap(payload);
  },

  async submitReport({ bookingId, category, description }) {
    if (apiConfig.ticketMocks) {
      await delay(350);
      const booking = findStoredBooking(bookingId);
      if (!booking) throw new Error('رزرو مربوط به گزارش پیدا نشد.');

      const report = {
        id: `rp-${Date.now()}`,
        bookingId,
        ticketId: booking.ticketId || booking.ticket?.id,
        category,
        description,
        status: 'pending',
        statusLabel: 'در انتظار بررسی',
        createdAt: new Date().toISOString(),
        ticket: enrichBooking(booking).ticket,
      };

      const reports = storage.get('reports', []);
      storage.set('reports', [report, ...reports]);
      return report;
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/reports`, {
      method: 'POST',
      body: JSON.stringify({ bookingId, category, description }),
    });
    return unwrap(payload);
  },

  async getReports() {
    if (apiConfig.ticketMocks) {
      await delay(150);
      return storage.get('reports', []);
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/reports/my`);
    return unwrap(payload);
  },
};
