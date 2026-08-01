import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';
import { tickets } from '../data/mockData.js';

const delay = (milliseconds = 250) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const unwrap = (payload) => payload?.data || payload;

function getMockTicket(ticketId) {
  return tickets.find((ticket) => ticket.id === ticketId) || null;
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

export const ticketService = {
  async getById(ticketId) {
    if (apiConfig.ticketMocks) {
      await delay(180);
      return getMockTicket(ticketId);
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/tickets/${ticketId}`);
    return unwrap(payload);
  },

  async reserve(ticketId, quantity = 1) {
    if (apiConfig.ticketMocks) {
      await delay();
      const ticket = getMockTicket(ticketId);

      if (!ticket) throw new Error('بلیط انتخاب‌شده پیدا نشد.');
      if (quantity < 1 || quantity > 4) throw new Error('تعداد بلیط معتبر نیست.');
      if (quantity > ticket.remaining) throw new Error('ظرفیت کافی برای این تعداد بلیط وجود ندارد.');

      const reservation = {
        id: `rs-${Date.now()}`,
        ticketId,
        quantity,
        status: 'reserved',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      storage.set('activeReservation', reservation);
      return reservation;
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/reservations`, {
      method: 'POST',
      body: JSON.stringify({ ticketId, quantity }),
    });
    return unwrap(payload);
  },

  async pay(reservationId, paymentMethod = 'bank_card') {
    if (apiConfig.ticketMocks) {
      await delay(450);
      const reservation = storage.get('activeReservation');

      if (!reservation || reservation.id !== reservationId) {
        throw new Error('رزرو فعال پیدا نشد. دوباره بلیط را رزرو کنید.');
      }

      if (new Date(reservation.expiresAt).getTime() <= Date.now()) {
        storage.remove('activeReservation');
        throw new Error('مهلت پرداخت رزرو به پایان رسیده است.');
      }

      const ticket = getMockTicket(reservation.ticketId);
      if (!ticket) throw new Error('اطلاعات بلیط در دسترس نیست.');

      const paidReservation = {
        ...reservation,
        status: 'paid',
        statusLabel: 'پرداخت‌شده',
        paymentMethod,
        paidAt: new Date().toISOString(),
        amount: ticket.price * reservation.quantity,
        ticket: {
          id: ticket.id,
          sportLabel: ticket.sportLabel,
          homeTeam: ticket.homeTeam,
          awayTeam: ticket.awayTeam,
          date: ticket.date,
          isoDate: ticket.isoDate,
          time: ticket.time,
          city: ticket.city,
          venue: ticket.venue,
          category: ticket.category,
          section: ticket.section,
        },
      };

      const previousReservations = storage.get('reservations', []);
      storage.set('reservations', [paidReservation, ...previousReservations]);
      storage.remove('activeReservation');

      return {
        success: true,
        trackingCode: `SP${Date.now().toString().slice(-9)}`,
        reservation: paidReservation,
      };
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/payments`, {
      method: 'POST',
      body: JSON.stringify({ reservationId, paymentMethod }),
    });
    return unwrap(payload);
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
