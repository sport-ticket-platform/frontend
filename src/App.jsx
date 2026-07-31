import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import TicketDetailsPage from './pages/TicketDetailsPage.jsx';
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
        <Route path="auth" element={(<PlaceholderPage title="ورود و ثبت‌نام" description="فرم ورود با رمز عبور و OTP"/>)}/>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
