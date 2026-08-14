import { apiRequest } from './apiClient.js';
import { apiConfig } from './apiConfig.js';

const unwrap = (payload) => payload?.data ?? payload;

const reportCategoryByType = {
  PAYMENT_ISSUE: 'payment',
  RESERVATION_ISSUE: 'seat',
  CANCEL_RESERVATION: 'unexpected_cancel',
  TECHNICAL_BUG: 'ticket_info',
  COMPLAINT: 'other',
  OTHER: 'other',
};

function normalizeAdminReport(report) {
  const status = report.status === 'CLOSED' ? 'resolved' : 'pending';
  return {
    id: String(report.reportId),
    reportId: Number(report.reportId),
    reporterName: report.userId ? `کاربر #${report.userId}` : 'کاربر',
    category: reportCategoryByType[report.type] || 'other',
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

export const supportService = {
  async getReports() {
    const payload = await apiRequest(`${apiConfig.adminBaseUrl}/report`);
    const summaries = unwrap(payload);
    if (!Array.isArray(summaries)) return [];
    return Promise.all(summaries.map(async (summary) => {
      try {
        const detail = await apiRequest(
          `${apiConfig.adminBaseUrl}/report/${summary.reportId}`,
        );
        return normalizeAdminReport(unwrap(detail));
      } catch {
        return normalizeAdminReport(summary);
      }
    }));
  },

  async answerReport(reportId, response) {
    await apiRequest(`${apiConfig.adminBaseUrl}/report/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({ response }),
    });
    return {
      response,
      status: 'resolved',
      statusLabel: 'رسیدگی‌شده',
      reviewedAt: new Date().toISOString(),
    };
  },
};
