import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  fetchCustomerReservations,
  type CustomerReservation,
  type ReservationStatus,
} from '../features/payments/paymentRepository';
import { cancelCustomerReservation } from '../features/payments/paymentApi';
import { getUserFacingError } from '../lib/errors';
import { formatDateTimeInLima, formatPen } from '../lib/formatters';

const statusStyle: Record<ReservationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-700',
  completed: 'bg-sky-100 text-sky-800',
  no_show: 'bg-red-100 text-red-800',
};

const statusLabel: Record<ReservationStatus, string> = {
  pending: 'Pendiente de pago',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Atendida',
  no_show: 'No asistió',
};

function isUpcoming(reservation: CustomerReservation, now: number): boolean {
  return (
    new Date(reservation.startsAt).getTime() >= now &&
    (reservation.status === 'pending' || reservation.status === 'confirmed')
  );
}

interface ReservationCardProps {
  reservation: CustomerReservation;
  now: number;
  isCancelling: boolean;
  isCancellationFormOpen: boolean;
  onOpenCancellation: (reservationId: string) => void;
  onCloseCancellation: () => void;
  onCancel: (reservationId: string, reason: string) => void;
}

function ReservationCard({
  reservation,
  now,
  isCancelling,
  isCancellationFormOpen,
  onOpenCancellation,
  onCloseCancellation,
  onCancel,
}: ReservationCardProps) {
  const needsPayment = reservation.status === 'pending' && new Date(reservation.startsAt).getTime() > now;
  const canRequestCancellation = ['pending', 'confirmed'].includes(reservation.status) && new Date(reservation.startsAt).getTime() > now;
  const serviceNames = reservation.items.map((item) => item.serviceName).join(' · ');
  const paymentLabel = reservation.payment?.status === 'approved'
    ? 'Pago simulado aprobado'
    : reservation.payment?.status === 'failed'
      ? 'Último intento rechazado'
      : reservation.payment?.status === 'refunded'
        ? 'Pago reembolsado'
        : reservation.status === 'pending'
          ? 'Pago pendiente'
          : 'Sin pago registrado';

  return (
    <article className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-xl font-semibold text-[#2d1937]">{formatDateTimeInLima(reservation.startsAt)}</p>
          <p className="mt-2 text-sm text-slate-600">{serviceNames || 'Servicios de la reserva'}</p>
        </div>
        <span className={'w-fit rounded-full px-3 py-1 text-sm font-semibold ' + statusStyle[reservation.status]}>
          {statusLabel[reservation.status]}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-rose-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          <p>Total: <strong className="text-[#2d1937]">{formatPen(reservation.totalAmount)}</strong></p>
          <p className="mt-1">{paymentLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2d1937] px-5 text-sm font-semibold text-white transition hover:bg-[#4a254f]"
            to={'/pago/' + reservation.id}
          >
            {needsPayment ? 'Realizar pago' : 'Ver detalle'}
          </Link>
          {canRequestCancellation && !isCancellationFormOpen ? (
            <button
              type="button"
              onClick={() => onOpenCancellation(reservation.id)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-300 px-5 text-sm font-semibold text-rose-800 transition hover:bg-rose-50"
            >
              Cancelar reserva
            </button>
          ) : null}
        </div>
      </div>

      {isCancellationFormOpen ? (
        <form
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const reason = formData.get('reason');
            onCancel(reservation.id, typeof reason === 'string' ? reason : '');
          }}
        >
          <label className="block text-sm font-semibold text-[#2d1937]" htmlFor={'cancellation-reason-' + reservation.id}>
            ¿Deseas cancelar esta reserva?
          </label>
          <p className="mt-1 text-sm text-slate-600">Las reservas confirmadas requieren al menos 12 horas de anticipación.</p>
          <textarea
            id={'cancellation-reason-' + reservation.id}
            name="reason"
            maxLength={500}
            placeholder="Motivo de cancelación (opcional)"
            className="mt-3 min-h-20 w-full rounded-lg border border-rose-200 bg-white p-3 text-sm text-slate-800"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button disabled={isCancelling} className="h-10 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
              {isCancelling ? 'Cancelando…' : 'Confirmar cancelación'}
            </button>
            <button type="button" disabled={isCancelling} onClick={onCloseCancellation} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-60">
              Volver
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

export function MyReservationsPage() {
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [cancellationReservationId, setCancellationReservationId] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);
  const [currentTime] = useState(() => new Date().getTime());

  useEffect(() => {
    let isActive = true;

    void fetchCustomerReservations()
      .then((nextReservations) => {
        if (isActive) {
          setReservations(nextReservations);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(getUserFacingError(error, 'No pudimos cargar tus reservas.'));
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleCancellation(reservationId: string, reason: string): Promise<void> {
    setCancellingReservationId(reservationId);
    setErrorMessage('');
    setActionMessage('');

    try {
      const result = await cancelCustomerReservation(reservationId, reason);
      const nextReservations = await fetchCustomerReservations();
      setReservations(nextReservations);
      setCancellationReservationId(null);
      setActionMessage(
        result.paymentStatus === 'refunded'
          ? 'Tu reserva fue cancelada y el pago simulado quedó marcado como reembolsado.'
          : 'Tu reserva fue cancelada correctamente.',
      );
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No fue posible cancelar la reserva.'));
    } finally {
      setCancellingReservationId(null);
    }
  }

  const { history, upcoming } = useMemo(() => {
    const upcomingReservations = reservations
      .filter((reservation) => isUpcoming(reservation, currentTime))
      .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
    const historyReservations = reservations.filter((reservation) => !isUpcoming(reservation, currentTime));

    return { upcoming: upcomingReservations, history: historyReservations };
  }, [currentTime, reservations]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Mis reservas</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937]">Tus citas y pagos</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">
        Revisa tus próximas citas, sus estados y el historial de tus reservas.
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

      {actionMessage ? (
        <output className="mt-8 block rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">{actionMessage}</output>
      ) : null}

      {!isLoading && !errorMessage && reservations.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-[#2d1937]">Aún no tienes reservas</h2>
          <p className="mt-3 text-slate-600">Cuando crees una cita, aquí podrás consultar todos sus detalles.</p>
          <Link className="mt-6 inline-flex rounded-xl bg-[#2d1937] px-5 py-3 text-sm font-semibold text-white" to="/reservar">
            Crear una reserva
          </Link>
        </div>
      ) : null}

      {!isLoading && !errorMessage && reservations.length > 0 ? (
        <div className="mt-8 space-y-10">
          <section aria-labelledby="upcoming-reservations">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="upcoming-reservations" className="font-display text-2xl font-semibold text-[#2d1937]">Próximas citas</h2>
              <span className="text-sm text-slate-500">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-rose-100 bg-white p-5 text-slate-600">No tienes próximas citas activas.</p>
            ) : (
              <div className="mt-4 space-y-4">{upcoming.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  now={currentTime}
                  isCancelling={cancellingReservationId === reservation.id}
                  isCancellationFormOpen={cancellationReservationId === reservation.id}
                  onOpenCancellation={(reservationId) => setCancellationReservationId(reservationId)}
                  onCloseCancellation={() => setCancellationReservationId(null)}
                  onCancel={(reservationId, reason) => void handleCancellation(reservationId, reason)}
                />
              ))}</div>
            )}
          </section>

          <section aria-labelledby="reservation-history">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="reservation-history" className="font-display text-2xl font-semibold text-[#2d1937]">Historial</h2>
              <span className="text-sm text-slate-500">{history.length}</span>
            </div>
            {history.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-rose-100 bg-white p-5 text-slate-600">Tus citas anteriores aparecerán aquí.</p>
            ) : (
              <div className="mt-4 space-y-4">{history.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  now={currentTime}
                  isCancelling={false}
                  isCancellationFormOpen={false}
                  onOpenCancellation={() => undefined}
                  onCloseCancellation={() => undefined}
                  onCancel={() => undefined}
                />
              ))}</div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
