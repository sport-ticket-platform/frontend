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
          time: ticket.time,
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
};
