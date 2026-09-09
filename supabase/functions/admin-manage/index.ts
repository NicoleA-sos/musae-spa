import { createServiceClient, requireUser } from '../_shared/auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const reservationStatuses = ['confirmed', 'cancelled', 'completed', 'no_show'] as const;

type ReservationStatus = (typeof reservationStatuses)[number];

function assertUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Error(`El campo ${field} no es válido.`);
  return value;
}

function assertText(value: unknown, field: string, maxLength: number, required = true): string | null {
  if (typeof value !== 'string') {
    if (!required && (value === null || value === undefined)) return null;
    throw new Error(`El campo ${field} no es válido.`);
  }

  const normalized = value.trim();
  if (required && !normalized) throw new Error(`El campo ${field} es obligatorio.`);
  if (normalized.length > maxLength) throw new Error(`El campo ${field} supera el límite permitido.`);
  return normalized || null;
}

function assertPrice(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10000) {
    throw new Error('El precio no es válido.');
  }

  return Math.round(value * 100) / 100;
}

function assertDuration(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 15 || value > 480) {
    throw new Error('La duración debe estar entre 15 y 480 minutos.');
  }

  return value;
}

function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`El campo ${field} no es válido.`);
  return value;
}

function assertTime(value: unknown, field: string): string {
  if (typeof value !== 'string' || !timePattern.test(value)) throw new Error(`El campo ${field} no es válido.`);
  return value;
}

async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  const admin = createServiceClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (error || profile?.role !== 'admin' || profile.status !== 'active') {
    throw jsonResponse(request, { error: 'No tienes permisos de administración.' }, 403);
  }

  return { admin, user };
}

async function saveService(
  admin: ReturnType<typeof createServiceClient>,
  actorId: string,
  body: Record<string, unknown>,
  isNew: boolean,
): Promise<string> {
  const categoryId = assertUuid(body.categoryId, 'categoría');
  const name = assertText(body.name, 'nombre', 120)!;
  const description = assertText(body.description, 'descripción', 800, false);
  const durationMinutes = assertDuration(body.durationMinutes);
  const price = assertPrice(body.price);
  const isActive = assertBoolean(body.isActive, 'estado');
  const values = {
    category_id: categoryId,
    name,
    description,
    duration_minutes: durationMinutes,
    price,
    is_active: isActive,
    updated_by: actorId,
  };

  if (isNew) {
    const { error } = await admin.from('services').insert({ ...values, created_by: actorId });
    if (error) throw new Error('No fue posible crear el servicio. Revisa que no esté repetido en la categoría.');
    return 'Servicio creado correctamente.';
  }

  const serviceId = assertUuid(body.serviceId, 'servicio');
  const { data, error } = await admin.from('services').update(values).eq('id', serviceId).select('id').maybeSingle();
  if (error || !data) throw new Error('No encontramos el servicio que deseas actualizar.');
  return 'Servicio actualizado correctamente.';
}

async function updateBusinessHours(
  admin: ReturnType<typeof createServiceClient>,
  actorId: string,
  body: Record<string, unknown>,
): Promise<string> {
  const businessHourId = assertUuid(body.businessHourId, 'horario');
  const opensAt = assertTime(body.opensAt, 'hora de apertura');
  const closesAt = assertTime(body.closesAt, 'hora de cierre');
  const isActive = assertBoolean(body.isActive, 'estado');

  if (opensAt >= closesAt) throw new Error('La hora de cierre debe ser posterior a la apertura.');

  const { data, error } = await admin
    .from('business_hours')
    .update({ opens_at: opensAt, closes_at: closesAt, is_active: isActive, updated_by: actorId })
    .eq('id', businessHourId)
    .select('id')
    .maybeSingle();

  if (error || !data) throw new Error('No encontramos el horario que deseas actualizar.');
  return 'Horario actualizado correctamente.';
}

async function createBlockedDate(
  admin: ReturnType<typeof createServiceClient>,
  actorId: string,
  body: Record<string, unknown>,
): Promise<string> {
  const date = body.date;
  const reason = assertText(body.reason, 'motivo', 300, false);

  if (typeof date !== 'string' || !datePattern.test(date)) throw new Error('La fecha bloqueada no es válida.');

  const { data: existing, error: existingError } = await admin
    .from('blocked_dates')
    .select('id')
    .eq('blocked_date', date)
    .eq('is_active', true)
    .maybeSingle();

  if (existingError) throw new Error('No fue posible comprobar la fecha bloqueada.');
  if (existing) throw new Error('Esa fecha ya está bloqueada.');

  const { error } = await admin.from('blocked_dates').insert({
    blocked_date: date,
    reason,
    is_active: true,
    created_by: actorId,
    updated_by: actorId,
  });

  if (error) throw new Error('No fue posible bloquear esa fecha.');
  return 'Fecha bloqueada correctamente.';
}

async function updateBlockedDate(
  admin: ReturnType<typeof createServiceClient>,
  actorId: string,
  body: Record<string, unknown>,
): Promise<string> {
  const blockedDateId = assertUuid(body.blockedDateId, 'fecha bloqueada');
  const isActive = assertBoolean(body.isActive, 'estado');
  const { data, error } = await admin
    .from('blocked_dates')
    .update({ is_active: isActive, updated_by: actorId })
    .eq('id', blockedDateId)
    .select('id')
    .maybeSingle();

  if (error || !data) throw new Error('No encontramos la fecha bloqueada.');
  return isActive ? 'Fecha bloqueada correctamente.' : 'Fecha desbloqueada correctamente.';
}

async function updateReservationStatus(
  admin: ReturnType<typeof createServiceClient>,
  actorId: string,
  body: Record<string, unknown>,
): Promise<string> {
  const reservationId = assertUuid(body.reservationId, 'reserva');
  const status = body.status;
  const cancellationReason = assertText(body.cancellationReason, 'motivo de cancelación', 500, false);

  if (typeof status !== 'string' || !reservationStatuses.includes(status as ReservationStatus)) {
    throw new Error('El estado de reserva no es válido.');
  }

  const { data: reservation, error: reservationError } = await admin
    .from('reservations')
    .select('id, status')
    .eq('id', reservationId)
    .maybeSingle();

  if (reservationError || !reservation) throw new Error('No encontramos la reserva seleccionada.');
  if (reservation.status === status) return 'La reserva ya tiene ese estado.';
  if (reservation.status === 'cancelled' || reservation.status === 'completed' || reservation.status === 'no_show') {
    throw new Error('No se puede cambiar una reserva que ya fue cerrada.');
  }

  if (status === 'confirmed') {
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (paymentError || !payment) throw new Error('Solo se puede confirmar una reserva con pago aprobado.');
  }

  if ((status === 'completed' || status === 'no_show') && reservation.status !== 'confirmed') {
    throw new Error('Solo una reserva confirmada puede finalizarse o marcarse como no asistida.');
  }

  const { error } = await admin
    .from('reservations')
    .update({
      status,
      cancellation_reason: status === 'cancelled' ? cancellationReason : null,
      updated_by: actorId,
    })
    .eq('id', reservationId);

  if (error) {
    const safeMessage = error.message === 'Una reserva confirmada solo puede cancelarse con 12 horas de anticipación'
      ? error.message
      : 'No fue posible actualizar el estado de la reserva.';
    throw new Error(safeMessage);
  }

  return 'Estado de reserva actualizado correctamente.';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: jsonResponse(request, {}).headers });
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Método no permitido.' }, 405);

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') throw new Error('La solicitud no tiene un formato válido.');

    const input = body as Record<string, unknown>;
    const { admin, user } = await requireAdmin(request);
    let message: string;

    switch (input.action) {
      case 'create-service': message = await saveService(admin, user.id, input, true); break;
      case 'update-service': message = await saveService(admin, user.id, input, false); break;
      case 'update-business-hours': message = await updateBusinessHours(admin, user.id, input); break;
      case 'create-blocked-date': message = await createBlockedDate(admin, user.id, input); break;
      case 'update-blocked-date': message = await updateBlockedDate(admin, user.id, input); break;
      case 'update-reservation-status': message = await updateReservationStatus(admin, user.id, input); break;
      default: throw new Error('La acción solicitada no es válida.');
    }

    return jsonResponse(request, { message });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'No fue posible guardar el cambio.';
    return jsonResponse(request, { error: message }, 400);
  }
});
