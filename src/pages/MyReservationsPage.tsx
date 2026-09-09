import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchPendingPaymentReservations,
  type PendingPaymentReservation,
} from '../features/payments/paymentRepository';
import { getUserFacingError } from '../lib/errors';
import { formatDateTimeInLima, formatPen } from '../lib/formatters';

export function MyReservationsPage() {
  const [reservations, setReservations] = useState<PendingPaymentReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    void fetchPendingPaymentReservations()
      .then((nextReservations) => {
        if (isActive) {
          setReservations(nextReservations);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(getUserFacingError(error, 'No pudimos cargar las reservas pendientes.'));
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Mis reservas</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937]">Pagos pendientes</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">
        Completa el pago simulado de tus próximas reservas para confirmarlas.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-4" aria-live="polite">
          {[1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-rose-100" />)}
          <span className="sr-only">Cargando reservas…</span>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">{errorMessage}</p>
      ) : null}

      {!isLoading && !errorMessage && reservations.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#2d1937]">No tienes pagos pendientes</h2>
          <p className="mt-3 text-slate-600">Cuando crees una reserva, podrás confirmarla mediante el pago simulado.</p>
          <Link className="mt-6 inline-flex rounded-xl bg-[#2d1937] px-5 py-3 text-sm font-semibold text-white" to="/reservar">
            Crear una reserva
          </Link>
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="mt-8 space-y-4">
          {reservations.map((reservation) => (
            <article key={reservation.id} className="flex flex-col gap-4 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-xl font-semibold text-[#2d1937]">{formatDateTimeInLima(reservation.startsAt)}</p>
                <p className="mt-1 text-sm text-slate-600">Total: {formatPen(reservation.totalAmount)}</p>
              </div>
              <Link className="inline-flex h-11 items-center justify-center rounded-xl bg-[#d65678] px-5 text-sm font-semibold text-white transition hover:bg-[#b83e63]" to={'/pago/' + reservation.id}>
                Realizar pago
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
