import { Route, Routes } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './features/auth/RequireAuth';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PaymentPage } from './pages/PaymentPage';
import { ProfilePage } from './pages/ProfilePage';
import { ServicesPage } from './pages/ServicesPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/servicios" element={<ServicesPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/reservar"
          element={
            <RequireAuth>
              <BookingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mis-reservas"
          element={
            <RequireAuth>
              <MyReservationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/pago/:reservationId"
          element={
            <RequireAuth>
              <PaymentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/perfil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/administracion"
          element={
            <RequireAuth requireAdmin>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
