import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';
import { storage } from './storage.js';
import { supportReportSeed, supportReservationSeed } from '../data/supportMockData.js';

const delay = (milliseconds = 220) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const unwrap = (payload) => payload?.data || payload;

const reportStatusLabels = {
  pending: 'در انتظار بررسی',
  reviewing: 'در حال بررسی',
  resolved: 'رسیدگی‌شده',
};

const reportCategoryByType = {
  PAYMENT_ISSUE: 'payment',
  RESERVATION_ISSUE: 'seat',
  CANCEL_RESERVATION: 'unexpected_cancel',
  TECHNICAL_BUG: 'ticket_info',
  COMPLAINT: 'other',
  OTHER: 'other',
};

function normalizeAdminReport(report) {
  const category = reportCategoryByType[report.type] || 'other';
  const status = report.status === 'CLOSED' ? 'resolved' : 'pending';

  return {
    id: String(report.reportId),
    reportId: Number(report.reportId),
    bookingId: '---',
    reporterName: report.userId ? `کاربر #${report.userId}` : 'کاربر',
    reporterContact: 'در پاسخ API موجود نیست',
    category,
    categoryLabel: report.type || 'OTHER',
    ticketTitle: `گزارش #${report.reportId}`,
    description: report.request || 'جزئیات گزارش در دسترس نیست.',
    response: report.response || null,
    status,
    statusLabel: status === 'resolved' ? 'رسیدگی‌شده' : 'در انتظار بررسی',
    createdAt: report.reportedAt,
    reviewedAt: report.respondedAt || null,
  };
}

function initializeMockCollection(key, seed) {
  const stored = storage.get(key);
  if (Array.isArray(stored)) return stored;
  storage.set(key, seed);
  return seed;
}

function mapUserReport(report) {
  const currentUser = storage.get('user', {});
  return {
    ...report,
    reporterName: report.reporterName
      || `${currentUser.firstName || 'کاربر'} ${currentUser.lastName || ''}`.trim(),
    reporterContact: report.reporterContact
      || currentUser.email
      || currentUser.phoneNumber
      || 'ثبت‌شده در نسخه آزمایشی',
    categoryLabel: report.categoryLabel || report.category,
    ticketTitle: report.ticketTitle
      || (report.ticket ? `${report.ticket.homeTeam} - ${report.ticket.awayTeam}` : report.ticketId),
  };
}

function mapUserReservation(reservation) {
  const currentUser = storage.get('user', {});
  return {
    ...reservation,
    userName: reservation.userName
      || `${currentUser.firstName || 'کاربر'} ${currentUser.lastName || ''}`.trim(),
    userContact: reservation.userContact
      || currentUser.email
      || currentUser.phoneNumber
      || 'ثبت‌شده در نسخه آزمایشی',
    ticketTitle: reservation.ticketTitle
      || (reservation.ticket ? `${reservation.ticket.homeTeam} - ${reservation.ticket.awayTeam}` : reservation.ticketId),
    reviewStatus: reservation.reviewStatus || 'normal',
    reviewStatusLabel: reservation.reviewStatusLabel || 'عادی',
    issue: reservation.issue || 'مورد مشکوکی برای این رزرو ثبت نشده است.',
  };
}

function updateCollectionItem(key, itemId, updater) {
  const collection = storage.get(key, []);
  const index = collection.findIndex((item) => item.id === itemId);
  if (index === -1) return null;

  const updatedItem = updater(collection[index]);
  const updatedCollection = [...collection];
  updatedCollection[index] = updatedItem;
  storage.set(key, updatedCollection);
  return updatedItem;
}

export const supportService = {
  async getReports() {
    if (apiConfig.supportMocks) {
      await delay();
      const seededReports = initializeMockCollection('supportReports', supportReportSeed);
      const userReports = storage.get('reports', []).map(mapUserReport);
      const allReports = [...userReports, ...seededReports];
      return allReports.filter((report, index) => (
        allReports.findIndex((item) => item.id === report.id) === index
      ));
    }

    const payload = await apiRequest(`${apiConfig.adminBaseUrl}/report`);
    const summaries = unwrap(payload);
    if (!Array.isArray(summaries)) return [];

    const reports = await Promise.all(summaries.map(async (summary) => {
      try {
        const detailPayload = await apiRequest(
          `${apiConfig.adminBaseUrl}/report/${summary.reportId}`,
        );
        return normalizeAdminReport(unwrap(detailPayload));
      } catch {
        return normalizeAdminReport(summary);
      }
    }));

    return reports;
  },

  async answerReport(reportId, response) {
    if (apiConfig.supportMocks) {
      await delay(300);
      const updater = (report) => ({
        ...report,
        response,
        status: 'resolved',
        statusLabel: reportStatusLabels.resolved,
        reviewedAt: new Date().toISOString(),
      });

      const supportReport = updateCollectionItem('supportReports', reportId, updater);
      if (supportReport) return supportReport;

      const userReport = updateCollectionItem('reports', reportId, updater);
      if (userReport) return mapUserReport(userReport);

      throw new Error('گزارش موردنظر پیدا نشد.');
    }

    await apiRequest(`${apiConfig.adminBaseUrl}/report/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({ response }),
    });
    return {
      response,
      status: 'resolved',
      statusLabel: reportStatusLabels.resolved,
      reviewedAt: new Date().toISOString(),
    };
  },

  async getReservations() {
    if (apiConfig.ticketMocks) {
      await delay();
      const seededReservations = initializeMockCollection('supportReservations', supportReservationSeed);
      const userReservations = storage.get('reservations', []).map(mapUserReservation);
      const allReservations = [...userReservations, ...seededReservations];
      return allReservations.filter((reservation, index) => (
        allReservations.findIndex((item) => item.id === reservation.id) === index
      ));
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/admin/reservations`);
    return unwrap(payload);
  },

  async reviewReservation(reservationId, action) {
    if (apiConfig.ticketMocks) {
      await delay(320);
      const updater = (reservation) => {
        if (action === 'cancel') {
          return {
            ...reservation,
            status: 'cancelled',
            statusLabel: 'لغوشده توسط پشتیبان',
            reviewStatus: 'cancelled',
            reviewStatusLabel: 'لغوشده',
            reviewedAt: new Date().toISOString(),
          };
        }

        return {
          ...reservation,
          reviewStatus: 'approved',
          reviewStatusLabel: 'تأییدشده',
          reviewedAt: new Date().toISOString(),
        };
      };

      const supportReservation = updateCollectionItem('supportReservations', reservationId, updater);
      if (supportReservation) return supportReservation;

      const userReservation = updateCollectionItem('reservations', reservationId, updater);
      if (userReservation) return mapUserReservation(userReservation);

      throw new Error('رزرو موردنظر پیدا نشد.');
    }

    const payload = await apiRequest(`${apiConfig.ticketBaseUrl}/admin/reservations/${reservationId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
    return unwrap(payload);
  },
};
