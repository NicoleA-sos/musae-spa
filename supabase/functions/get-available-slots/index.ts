import { createServiceClient, requireUser } from '../_shared/auth.ts';
import { jsonResponse } from '../_shared/cors.ts';
import { parseAvailabilityInput } from '../_shared/booking-validation.ts';

interface BusyReservation {
  starts_at: string;
  ends_at: string;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
}

function limaDateTime(date: string, minutes: number): Date {
  return new Date(date + 'T' + minutesToTime(minutes) + ':00-05:00');
}

function isOverlapping(start: Date, end: Date, reservation: BusyReservation): boolean {
  const busyStart = new Date(reservation.starts_at);
  const busyEnd = new Date(reservation.ends_at);

  return start < busyEnd && end > busyStart;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonResponse(request, {}).headers });
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'Método no permitido.' }, 405);
  }

  try {
    await requireUser(request);
    const { date, serviceIds } = parseAvailabilityInput(await request.json());
    const admin = createServiceClient();
    const dayAtNoon = new Date(date + 'T12:00:00-05:00');
    const dayOfWeek = dayAtNoon.getUTCDay();

    const [{ data: services, error: servicesError }, { data: hours, error: hoursError }, { data: blockedDate }] =
      await Promise.all([
        admin
          .from('services')
          .select('id, duration_minutes, price')
          .in('id', serviceIds)
          .eq('is_active', true),
        admin
          .from('business_hours')
          .select('opens_at, closes_at')
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true)
          .maybeSingle(),
        admin
          .from('blocked_dates')
          .select('id')
          .eq('blocked_date', date)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

    if (servicesError || hoursError) {
      console.error('Availability catalog query failed', {
        servicesError: servicesError?.message ?? null,
        hoursError: hoursError?.message ?? null,
      });
      throw new Error('No fue posible consultar la disponibilidad.');
    }

    if (!services || services.length !== serviceIds.length) {
      return jsonResponse(request, { error: 'Uno o más servicios ya no están disponibles.' }, 422);
    }

    const totalDurationMinutes = services.reduce((total, service) => total + Number(service.duration_minutes), 0);
    const totalAmount = services.reduce((total, service) => total + Number(service.price), 0);

    if (!hours || blockedDate) {
      return jsonResponse(request, {
        slots: [],
        totalDurationMinutes,
        totalAmount,
      });
    }

    const dayStart = new Date(date + 'T00:00:00-05:00');
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const { data: reservations, error: reservationsError } = await admin
      .from('reservations')
      .select('starts_at, ends_at')
      .in('status', ['pending', 'confirmed'])
      .gte('starts_at', dayStart.toISOString())
      .lt('starts_at', dayEnd.toISOString());

    if (reservationsError) {
      throw new Error('No fue posible consultar la disponibilidad.');
    }

    const openingMinutes = timeToMinutes(hours.opens_at);
    const closingMinutes = timeToMinutes(hours.closes_at);
    const slots: { startsAt: string; label: string }[] = [];

    for (
      let startMinutes = openingMinutes;
      startMinutes + totalDurationMinutes <= closingMinutes;
      startMinutes += 30
    ) {
      const start = limaDateTime(date, startMinutes);
      const end = new Date(start.getTime() + totalDurationMinutes * 60 * 1000);

      if (start <= new Date()) continue;

      if (!(reservations ?? []).some((reservation) => isOverlapping(start, end, reservation))) {
        slots.push({ startsAt: start.toISOString(), label: minutesToTime(startMinutes) });
      }
    }

    return jsonResponse(request, { slots, totalDurationMinutes, totalAmount });
  } catch (error) {
    if (error instanceof Response) return error;

    const message = error instanceof Error ? error.message : 'No fue posible consultar la disponibilidad.';
    return jsonResponse(request, { error: message }, 400);
  }
});
