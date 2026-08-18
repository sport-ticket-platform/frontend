import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SupportRoute from './components/SupportRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import TicketDetailsPage from './pages/TicketDetailsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ReservationDetailPage from './pages/ReservationDetailPage.jsx';
import ReportIssuePage from './pages/ReportIssuePage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import AdminToolsPage from './pages/AdminToolsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
          <Route path="checkout/:ticketId" element={<CheckoutPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dashboard/reservations/:reservationId" element={<ReservationDetailPage />} />
          <Route path="dashboard/bookings/:bookingId/report" element={<ReportIssuePage />} />
        </Route>
        <Route element={<SupportRoute />}>
          <Route path="support" element={<SupportPage />} />
          <Route path="admin" element={<AdminToolsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
