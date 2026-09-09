import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { processSimulatedPayment, type SimulatedPaymentResult } from '../features/payments/paymentApi';
import { fetchPaymentReservation, type PaymentReservation } from '../features/payments/paymentRepository';
import { getUserFacingError } from '../lib/errors';
import { formatDateTimeInLima, formatDuration, formatPen } from '../lib/formatters';

export function PaymentPage() {
  const { reservationId } = useParams();
  const [reservation, setReservation] = useState<PaymentReservation | null>(null);
  const [result, setResult] = useState<SimulatedPaymentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!reservationId) return;

    let isActive = true;

    void fetchPaymentReservation(reservationId)
      .then((nextReservation) => {
        if (isActive) {
          setReservation(nextReservation);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(getUserFacingError(error, 'No pudimos cargar la reserva.'));
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [reservationId]);

  async function handlePayment() {
    if (!reservation) return;

    setErrorMessage('');
    setIsProcessing(true);

    try {
      const nextResult = await processSimulatedPayment(reservation.id);
      setResult(nextResult);
      setReservation((current) => (current ? { ...current, status: 'confirmed' } : current));
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No fue posible procesar el pago simulado.'));
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading && reservationId) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8" aria-live="polite">
        <div className="h-72 animate-pulse rounded-3xl bg-rose-100" />
        <span className="sr-only">Cargando el pago…</span>
      </section>
    );
  }

  if (!reservation) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-display text-3xl font-semibold text-[#2d1937]">No pudimos abrir el pago</h1>
          <p className="mt-3 text-slate-600">{errorMessage || 'La reserva no está disponible.'}</p>
          <Link className="mt-6 inline-flex rounded-xl bg-[#2d1937] px-5 py-3 text-sm font-semibold text-white" to="/mis-reservas">
            Ver mis reservas
          </Link>
        </div>
      </section>
    );
  }

  const isAlreadyConfirmed = reservation.status === 'confirmed';

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Pago simulado</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937]">Confirma tu reserva</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">
        Este entorno simula un pago: no solicita ni guarda datos de tarjetas reales.
      </p>

      <div className="mt-8 rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(82,24,57,0.45)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rose-100 pb-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#2d1937]">Detalle de la cita</h2>
            <p className="mt-2 text-sm text-slate-600">{formatDateTimeInLima(reservation.startsAt)}</p>
          </div>
          <span className={
            'rounded-full px-3 py-1 text-sm font-semibold ' +
            (isAlreadyConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
          }>
            {isAlreadyConfirmed ? 'Confirmada' : 'Pendiente de pago'}
          </span>
        </div>

        <ul className="mt-5 space-y-4">
          {reservation.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
              <span>
                <strong className="block text-slate-800">{item.serviceName}</strong>
                <span className="text-slate-500">{formatDuration(item.durationMinutes)}</span>
              </span>
              <span className="shrink-0 font-semibold text-[#2d1937]">{formatPen(item.unitPrice)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between border-t border-rose-100 pt-5">
          <span className="font-semibold text-slate-700">Total a pagar</span>
          <strong className="font-display text-2xl text-[#2d1937]">{formatPen(reservation.totalAmount)}</strong>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {result ? (
          <output className="mt-5 block rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <p className="font-semibold">Pago simulado aprobado. Tu reserva está confirmada.</p>
            <p className="mt-1 text-sm">Código de pago: {result.paymentId}</p>
          </output>
        ) : null}

        {!result && !isAlreadyConfirmed ? (
          <button
            type="button"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#d65678] px-4 text-sm font-semibold text-white transition hover:bg-[#b83e63] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handlePayment()}
            disabled={isProcessing}
          >
            {isProcessing ? 'Procesando pago…' : 'Simular pago de ' + formatPen(reservation.totalAmount)}
          </button>
        ) : null}

        <Link className="mt-5 block text-center text-sm font-semibold text-[#8f244c] hover:underline" to="/mis-reservas">
          Volver a mis reservas
        </Link>
      </div>
    </section>
  );
}
