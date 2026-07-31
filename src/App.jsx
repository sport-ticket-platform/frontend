import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import TicketDetailsPage from './pages/TicketDetailsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}