import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
