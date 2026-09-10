import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  processSimulatedPayment,
  type SimulatedPaymentMethod,
  type SimulatedPaymentOutcome,
  type SimulatedPaymentResult,
} from '../features/payments/paymentApi';
import { fetchPaymentReservation, type PaymentReservation } from '../features/payments/paymentRepository';
import { getUserFacingError } from '../lib/errors';
import { formatDateTimeInLima, formatDuration, formatPen } from '../lib/formatters';

const methodCopy: Record<SimulatedPaymentMethod, { label: string; description: string }> = {
  card: { label: 'Tarjeta', description: 'Datos ficticios de tarjeta' },
  yape: { label: 'Yape', description: 'Celular y código ficticios' },
  plin: { label: 'Plin', description: 'Celular y código ficticios' },
};

const paymentStatusLabel: Record<'pending' | 'approved' | 'failed' | 'refunded', string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  failed: 'Rechazado',
  refunded: 'Reembolsado',
};

function providerLabel(provider: string): string {
  if (provider === 'simulated_card') return 'Tarjeta simulada';
  if (provider === 'simulated_yape') return 'Yape simulado';
  if (provider === 'simulated_plin') return 'Plin simulado';
  return 'Pago simulado';
}

function validateFakeDetails(
  method: SimulatedPaymentMethod,
  cardAlias: string,
  cardNumber: string,
  cardExpiry: string,
  cardCode: string,
  walletNumber: string,
  walletCode: string,
): string {
  if (method === 'card') {
    if (cardAlias.trim().length < 3) return 'Escribe un alias de prueba para la tarjeta.';
    if (!/^0000\d{12}$/.test(cardNumber.replaceAll(' ', ''))) return 'Usa una tarjeta ficticia de 16 dígitos que empiece con 0000.';
    if (cardExpiry.trim() !== '00/00') return 'Para esta demostración, usa 00/00 como vencimiento ficticio.';
    if (cardCode.trim() !== '000') return 'Para esta demostración, usa 000 como código ficticio.';
    return '';
  }

  if (walletNumber.replaceAll(' ', '') !== '000000000') return 'Usa el celular ficticio 000000000.';
  if (walletCode.trim() !== '000000') return 'Usa el código ficticio 000000.';
  return '';
}

export function PaymentPage() {
  const { reservationId } = useParams();
  const [reservation, setReservation] = useState<PaymentReservation | null>(null);
  const [result, setResult] = useState<SimulatedPaymentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [method, setMethod] = useState<SimulatedPaymentMethod>('card');
  const [outcome, setOutcome] = useState<SimulatedPaymentOutcome>('approved');
  const [cardAlias, setCardAlias] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [walletCode, setWalletCode] = useState('');
  const [currentTime] = useState(() => new Date().getTime());

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

    const detailError = validateFakeDetails(method, cardAlias, cardNumber, cardExpiry, cardCode, walletNumber, walletCode);
    if (detailError) {
      setErrorMessage(detailError);
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

    try {
      // Los datos de demostración permanecen en el navegador. Al servidor solo van método y resultado ficticio.
      const nextResult = await processSimulatedPayment(reservation.id, method, outcome);
      const nextPaymentStatus = nextResult.paymentStatus === 'approved' ? 'approved' : 'failed';
      const createdAt = new Date().toISOString();

      setResult(nextResult);
      setReservation((current) => current
        ? {
            ...current,
            status: nextResult.reservationStatus,
            payment: {
              id: nextResult.paymentId,
              status: nextPaymentStatus,
              provider: 'simulated_' + method,
              operationCode: nextResult.operationCode,
              createdAt,
            },
            paymentAttempts: [
              {
                id: nextResult.paymentId,
                status: nextPaymentStatus,
                provider: 'simulated_' + method,
                operationCode: nextResult.operationCode,
                createdAt,
              },
              ...current.paymentAttempts.filter((attempt) => attempt.id !== nextResult.paymentId),
            ],
          }
        : current);
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

  const canProcessPayment = reservation.status === 'pending' && new Date(reservation.startsAt).getTime() > currentTime;
  const paymentWasApproved = reservation.payment?.status === 'approved';
  const reservationStatusLabel = {
    pending: 'Pendiente de pago',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Atendida',
    no_show: 'No asistió',
  }[reservation.status];
  const reservationStatusStyle = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-slate-200 text-slate-700',
    completed: 'bg-sky-100 text-sky-800',
    no_show: 'bg-red-100 text-red-800',
  }[reservation.status];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">
        {canProcessPayment ? 'Pasarela de pago simulada' : 'Detalle de reserva'}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937]">
        {canProcessPayment ? 'Confirma tu reserva' : 'Detalle de tu cita'}
      </h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">
        {canProcessPayment
          ? 'Esta es una demostración: usa solo datos ficticios. No se solicita, transmite ni almacena información bancaria real.'
          : 'Consulta los servicios, fecha, importe y estado de esta reserva.'}
      </p>

      <div className="mt-8 rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(82,24,57,0.45)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rose-100 pb-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#2d1937]">Detalle de la cita</h2>
            <p className="mt-2 text-sm text-slate-600">{formatDateTimeInLima(reservation.startsAt)}</p>
          </div>
          <span className={'rounded-full px-3 py-1 text-sm font-semibold ' + reservationStatusStyle}>
            {reservationStatusLabel}
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
          <output className={'mt-5 block rounded-xl border p-4 ' + (result.paymentStatus === 'approved'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-red-200 bg-red-50 text-red-900')}>
            {result.paymentStatus === 'approved' ? (
              <>
                <p className="font-semibold">Pago simulado aprobado. Tu reserva está confirmada.</p>
                <p className="mt-1 text-sm">Código de operación: {result.operationCode}</p>
              </>
            ) : (
              <>
                <p className="font-semibold">Pago simulado rechazado.</p>
                <p className="mt-1 text-sm">El intento quedó registrado. Tu reserva sigue pendiente de pago y puedes probar nuevamente.</p>
              </>
            )}
          </output>
        ) : null}

        {!result && canProcessPayment ? (
          <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); void handlePayment(); }}>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">1. Elige un método</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Método de pago simulado">
                {(Object.keys(methodCopy) as SimulatedPaymentMethod[]).map((nextMethod) => (
                  <button
                    key={nextMethod}
                    type="button"
                    className={'rounded-xl border p-3 text-left transition ' + (method === nextMethod
                      ? 'border-[#b83e63] bg-rose-50 ring-1 ring-[#b83e63]'
                      : 'border-rose-100 bg-white hover:border-rose-300')}
                    onClick={() => { setMethod(nextMethod); setErrorMessage(''); }}
                    aria-pressed={method === nextMethod}
                  >
                    <span className="block font-semibold text-[#2d1937]">{methodCopy[nextMethod].label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{methodCopy[nextMethod].description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {method === 'card' ? (
              <fieldset className="grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 sm:grid-cols-2">
                <legend className="px-1 text-sm font-semibold text-slate-800">2. Datos ficticios de tarjeta</legend>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Alias de prueba
                  <input value={cardAlias} onChange={(event) => setCardAlias(event.target.value)} autoComplete="off" maxLength={60} placeholder="Musaé Demo" className="mt-1 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 font-normal" />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Número ficticio
                  <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} autoComplete="off" inputMode="numeric" maxLength={19} placeholder="0000 0000 0000 1234" className="mt-1 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 font-normal" />
                </label>
                <label className="text-sm font-medium text-slate-700">Vencimiento ficticio
                  <input value={cardExpiry} onChange={(event) => setCardExpiry(event.target.value)} autoComplete="off" maxLength={5} placeholder="00/00" className="mt-1 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 font-normal" />
                </label>
                <label className="text-sm font-medium text-slate-700">Código ficticio
                  <input value={cardCode} onChange={(event) => setCardCode(event.target.value)} autoComplete="off" inputMode="numeric" maxLength={3} placeholder="000" className="mt-1 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 font-normal" />
                </label>
              </fieldset>
            ) : (
              <fieldset className="grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 sm:grid-cols-2">
                <legend className="px-1 text-sm font-semibold text-slate-800">2. Datos ficticios de {methodCopy[method].label}</legend>
                <label className="text-sm font-medium text-slate-700">Celular ficticio
                  <input value={walletNumber} onChange={(event) => setWalletNumber(event.target.value)} autoComplete="off" inputMode="numeric" maxLength={9} placeholder="000000000" className="mt-1 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 font-normal" />
                </label>
                <label className="text-sm font-medium text-slate-700">Código ficticio
                  <input value={walletCode} onChange={(event) => setWalletCode(event.target.value)} autoComplete="off" inputMode="numeric" maxLength={6} placeholder="000000" className="mt-1 h-11 w-full rounded-xl border border-rose-200 bg-white px-3 font-normal" />
                </label>
              </fieldset>
            )}

            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">3. Resultado a simular</legend>
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <input checked={outcome === 'approved'} onChange={() => setOutcome('approved')} name="payment-outcome" type="radio" /> Aprobar pago
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  <input checked={outcome === 'rejected'} onChange={() => setOutcome('rejected')} name="payment-outcome" type="radio" /> Rechazar pago
                </label>
              </div>
            </fieldset>

            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Demostración: estos campos no se envían al servidor ni se guardan. Solo se registra el método elegido y el resultado simulado.
            </p>

            <button
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#d65678] px-4 text-sm font-semibold text-white transition hover:bg-[#b83e63] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isProcessing}
            >
              {isProcessing ? 'Procesando pago…' : 'Simular ' + (outcome === 'approved' ? 'aprobación' : 'rechazo') + ' de ' + formatPen(reservation.totalAmount)}
            </button>
          </form>
        ) : null}

        {result?.paymentStatus === 'rejected' && canProcessPayment ? (
          <button
            type="button"
            className="mt-5 h-11 w-full rounded-xl border border-[#8f244c] px-4 text-sm font-semibold text-[#8f244c] transition hover:bg-rose-50"
            onClick={() => { setResult(null); setErrorMessage(''); }}
          >
            Simular otro intento
          </button>
        ) : null}

        {reservation.paymentAttempts.length > 0 ? (
          <section className="mt-6 border-t border-rose-100 pt-5" aria-labelledby="payment-attempts">
            <h3 id="payment-attempts" className="font-semibold text-slate-800">Intentos registrados</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {reservation.paymentAttempts.map((attempt) => (
                <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span>{providerLabel(attempt.provider)} · {paymentStatusLabel[attempt.status]}</span>
                  <span className="text-xs text-slate-500">{attempt.operationCode || formatDateTimeInLima(attempt.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!result && !canProcessPayment ? (
          <p className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-slate-700">
            {paymentWasApproved
              ? 'El pago simulado fue aprobado y la reserva está confirmada.'
              : 'Esta reserva ya no está disponible para pago.'}
          </p>
        ) : null}

        <Link className="mt-5 block text-center text-sm font-semibold text-[#8f244c] hover:underline" to="/mis-reservas">
          Volver a mis reservas
        </Link>
      </div>
    </section>
  );
}
