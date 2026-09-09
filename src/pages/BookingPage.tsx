import { useMemo, useState } from 'react';

import { useServiceCatalog } from '../features/services/useServiceCatalog';
import {
  createReservation,
  fetchAvailableSlots,
  type AvailableSlot,
  type AvailabilityQuote,
} from '../features/reservations/bookingApi';
import { formatDuration, formatPen } from '../lib/formatters';
import { getUserFacingError } from '../lib/errors';

function getLimaDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return valueFor('year') + '-' + valueFor('month') + '-' + valueFor('day');
}

export function BookingPage() {
  const { errorMessage: catalogError, isLoading: isCatalogLoading, services } = useServiceCatalog();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(getLimaDate);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [quote, setQuote] = useState<AvailabilityQuote | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [selectedServiceIds, services],
  );
  const estimatedDuration = selectedServices.reduce((total, service) => total + service.durationMinutes, 0);
  const estimatedTotal = selectedServices.reduce((total, service) => total + service.price, 0);
  const todayInLima = getLimaDate();

  function toggleService(serviceId: string) {
    setSelectedServiceIds((currentIds) =>
      currentIds.includes(serviceId)
        ? currentIds.filter((currentId) => currentId !== serviceId)
        : [...currentIds, serviceId],
    );
    setSlots(null);
    setQuote(null);
    setSelectedSlot(null);
    setErrorMessage('');
    setNotice('');
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    setSlots(null);
    setQuote(null);
    setSelectedSlot(null);
    setErrorMessage('');
    setNotice('');
  }

  async function handleAvailability() {
    setErrorMessage('');
    setNotice('');

    if (selectedServiceIds.length === 0) {
      setErrorMessage('Selecciona al menos un servicio para consultar horarios.');
      return;
    }

    if (!date || date < todayInLima) {
      setErrorMessage('Selecciona una fecha que no esté en el pasado.');
      return;
    }

    setIsCheckingAvailability(true);

    try {
      const nextQuote = await fetchAvailableSlots({ date, serviceIds: selectedServiceIds });
      setQuote(nextQuote);
      setSlots(nextQuote.slots);
      setSelectedSlot(null);
    } catch (error) {
      setSlots(null);
      setQuote(null);
      setErrorMessage(getUserFacingError(error, 'No pudimos consultar los horarios disponibles.'));
    } finally {
      setIsCheckingAvailability(false);
    }
  }

  async function handleCreateReservation() {
    setErrorMessage('');
    setNotice('');

    if (!selectedSlot) {
      setErrorMessage('Elige un horario disponible para continuar.');
      return;
    }

    setIsCreating(true);

    try {
      const { reservationId } = await createReservation({
        startsAt: selectedSlot.startsAt,
        serviceIds: selectedServiceIds,
        customerNotes: customerNotes.trim() || null,
      });

      setNotice(
        'Tu reserva fue creada. Código: ' +
          reservationId +
          '. En la siguiente fase podrás realizar el pago simulado.',
      );
      setSelectedSlot(null);
      setSlots(null);
    } catch (error) {
      setErrorMessage(getUserFacingError(error, 'No fue posible crear la reserva.'));
      setSelectedSlot(null);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.18em] text-[#b83e63] uppercase">Nueva reserva</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#2d1937] sm:text-5xl">
          Elige tus servicios, fecha y horario.
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          La disponibilidad y el precio final se vuelven a validar desde el servidor antes de crear tu cita.
        </p>
      </div>

      {catalogError ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
          <p className="font-semibold">No pudimos cargar los servicios.</p>
          <p className="mt-1 text-sm">{catalogError}</p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_23rem]">
        <div>
          <fieldset disabled={isCatalogLoading} className="space-y-4">
            <legend className="font-display text-2xl font-semibold text-[#2d1937]">1. Servicios</legend>
            {isCatalogLoading ? (
              <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-36 animate-pulse rounded-2xl bg-rose-100" />
                ))}
                <span className="sr-only">Cargando servicios…</span>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-pressed={isSelected}
                      className={
                        'rounded-2xl border p-5 text-left transition focus-visible:outline-3 focus-visible:outline-[#d65678] focus-visible:outline-offset-3 ' +
                        (isSelected
                          ? 'border-[#d65678] bg-rose-100 shadow-sm'
                          : 'border-rose-100 bg-white hover:border-rose-300')
                      }
                      onClick={() => toggleService(service.id)}
                    >
                      <span className="block font-display text-xl font-semibold text-[#2d1937]">{service.name}</span>
                      <span className="mt-2 block text-sm text-slate-600">
                        {formatDuration(service.durationMinutes)} · {formatPen(service.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div className="mt-9">
            <label className="font-display text-2xl font-semibold text-[#2d1937]" htmlFor="booking-date">
              2. Fecha
            </label>
            <input
              id="booking-date"
              className="mt-4 h-12 w-full max-w-sm rounded-xl border border-rose-200 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-[#d65678] focus:ring-4 focus:ring-rose-100"
              type="date"
              min={todayInLima}
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
            />
            <p className="mt-2 text-sm text-slate-500">Horario de atención según la zona horaria de Lima, Perú.</p>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="h-11 rounded-xl bg-[#2d1937] px-5 text-sm font-semibold text-white transition hover:bg-[#4a254f] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleAvailability()}
              disabled={selectedServiceIds.length === 0 || isCheckingAvailability || Boolean(catalogError)}
            >
              {isCheckingAvailability ? 'Consultando horarios…' : 'Ver horarios disponibles'}
            </button>
          </div>

          {slots ? (
            <section className="mt-9" aria-live="polite">
              <h2 className="font-display text-2xl font-semibold text-[#2d1937]">3. Horarios disponibles</h2>
              {slots.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-rose-100 bg-white p-5 text-slate-600">
                  No hay horarios disponibles para esta combinación. Prueba otra fecha o menos servicios.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.startsAt === slot.startsAt;

                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        aria-pressed={isSelected}
                        className={
                          'rounded-xl border px-4 py-3 text-sm font-semibold transition ' +
                          (isSelected
                            ? 'border-[#d65678] bg-[#d65678] text-white'
                            : 'border-rose-200 bg-white text-[#5c1741] hover:bg-rose-50')
                        }
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}
        </div>

        <aside className="h-fit rounded-3xl border border-rose-100 bg-white p-6 shadow-[0_18px_50px_-28px_rgba(82,24,57,0.45)] lg:sticky lg:top-24">
          <h2 className="font-display text-2xl font-semibold text-[#2d1937]">Tu resumen</h2>
          {selectedServices.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">Selecciona uno o más servicios para ver el resumen.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {selectedServices.map((service) => (
                <li key={service.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-700">{service.name}</span>
                  <span className="shrink-0 font-semibold text-[#2d1937]">{formatPen(service.price)}</span>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-6 space-y-3 border-t border-rose-100 pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Duración</dt>
              <dd className="font-semibold text-[#2d1937]">
                {formatDuration(quote?.totalDurationMinutes ?? estimatedDuration)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Total</dt>
              <dd className="font-semibold text-[#2d1937]">{formatPen(quote?.totalAmount ?? estimatedTotal)}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <label className="text-sm font-semibold text-slate-700" htmlFor="customer-notes">
              Nota para el salón <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="customer-notes"
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-rose-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-[#d65678] focus:ring-4 focus:ring-rose-100"
              maxLength={500}
              value={customerNotes}
              onChange={(event) => setCustomerNotes(event.target.value)}
            />
          </div>

          {errorMessage ? (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {notice ? (
            <output className="mt-5 block rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
              {notice}
            </output>
          ) : null}

          <button
            type="button"
            className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#d65678] px-4 text-sm font-semibold text-white transition hover:bg-[#b83e63] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleCreateReservation()}
            disabled={!selectedSlot || isCreating}
          >
            {isCreating ? 'Creando reserva…' : 'Crear reserva'}
          </button>
        </aside>
      </div>
    </section>
  );
}
